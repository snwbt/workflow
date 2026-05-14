import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';

const imageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const videoTypes = new Set(['video/mp4', 'video/webm']);

function getUploadType(file: File, purpose?: FormDataEntryValue | null) {
  const ext = path.extname(file.name).toLowerCase();
  if (purpose === 'wallpaper') {
    const isJpeg = file.type === 'image/jpeg' || (ext === '.jpg' || ext === '.jpeg') && (!file.type || file.type === 'application/octet-stream');
    const isPng = file.type === 'image/png' || ext === '.png' && (!file.type || file.type === 'application/octet-stream');
    if (isJpeg) return { valid: true, contentType: 'image/jpeg', mediaType: 'image' };
    if (isPng) return { valid: true, contentType: 'image/png', mediaType: 'image' };
    return { valid: false, contentType: file.type, mediaType: '' };
  }

  if (ext === '.ico' && (!file.type || file.type === 'application/octet-stream' || imageTypes.has(file.type))) {
    return { valid: true, contentType: 'image/x-icon', mediaType: 'image' };
  }
  if (imageTypes.has(file.type)) return { valid: true, contentType: file.type, mediaType: 'image' };
  if (videoTypes.has(file.type)) return { valid: true, contentType: file.type, mediaType: 'video' };
  return { valid: false, contentType: file.type, mediaType: '' };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const purpose = formData.get('purpose');
    const uploadType = getUploadType(file, purpose);
    if (!uploadType.valid) {
      const message = purpose === 'wallpaper'
        ? 'Unsupported wallpaper type. Please upload a PNG or JPG image.'
        : 'Unsupported file type. Please upload an image or video.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Validate size (e.g. 50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit.' }, { status: 400 });
    }

    // Create unique filename
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`media/${filename}`, file, {
        access: 'public',
        addRandomSuffix: true,
        contentType: uploadType.contentType,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        type: uploadType.mediaType,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure directory exists
    const mediaDir = path.join(process.cwd(), 'public', 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const filePath = path.join(mediaDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/media/${filename}`;

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      type: uploadType.mediaType
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
  }
}
