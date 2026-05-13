import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload an image or video.' }, { status: 400 });
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
        contentType: file.type,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        type: file.type.startsWith('video/') ? 'video' : 'image',
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
      type: file.type.startsWith('video/') ? 'video' : 'image'
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
  }
}
