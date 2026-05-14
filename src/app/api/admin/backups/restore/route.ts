import { NextResponse } from 'next/server';
import { previewBackup, restoreBackup, type BackupEnvelope, type BackupScope } from '@/lib/backups';

export const dynamic = 'force-dynamic';

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const envelope = body.backup as BackupEnvelope;
    if (!envelope?.payload) {
      return noStore(NextResponse.json({ error: 'Backup file is missing or invalid.' }, { status: 400 }));
    }

    if (body.restore) {
      const restoredScopes = await restoreBackup(envelope, body.scopes as BackupScope[] || []);
      return noStore(NextResponse.json({ success: true, restoredScopes }));
    }

    return noStore(NextResponse.json({ success: true, preview: previewBackup(envelope) }));
  } catch (error) {
    console.error('Error restoring backup:', error);
    return noStore(NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process backup.' },
      { status: 500 }
    ));
  }
}
