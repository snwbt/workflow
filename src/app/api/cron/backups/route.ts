import { NextResponse } from 'next/server';
import { runScheduledBackup } from '@/lib/backups';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request) {
  const secret = process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  const urlSecret = new URL(request.url).searchParams.get('secret');
  return bearer === secret || urlSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await runScheduledBackup();
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Scheduled backup failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scheduled backup failed.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}
