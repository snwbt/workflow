import { NextResponse } from 'next/server';
import { readStoredBackup } from '@/lib/backups';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Backup id is required.' }, { status: 400 });
    }

    const backup = await readStoredBackup(id);
    const body = JSON.stringify(backup, null, 2);
    const response = new NextResponse(body);
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(id.split('/').pop() || 'backup.json')}"`);
    return response;
  } catch (error) {
    console.error('Error downloading backup:', error);
    return NextResponse.json({ error: 'Failed to download backup.' }, { status: 500 });
  }
}
