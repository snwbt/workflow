import { NextResponse } from 'next/server';
import {
  createBackup,
  defaultBackupSettings,
  listBackups,
  normalizeBackupSettings,
  type BackupScope,
} from '@/lib/backups';
import { getDatabaseRuntimeInfo, getDb, saveBackupSettings } from '@/lib/db';
import { hasBackupEncryptionKey, hasDataEncryptionKey } from '@/lib/cryptoVault';

export const dynamic = 'force-dynamic';

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

export async function GET() {
  try {
    const db = await getDb();
    return noStore(NextResponse.json({
      settings: normalizeBackupSettings(db.backup_settings || defaultBackupSettings),
      backups: await listBackups(),
      encryption: {
        dataConfigured: hasDataEncryptionKey(),
        backupConfigured: hasBackupEncryptionKey(),
      },
      database: getDatabaseRuntimeInfo(),
    }));
  } catch (error) {
    console.error('Error loading backups:', error);
    return noStore(NextResponse.json({ error: 'Failed to load backups.' }, { status: 500 }));
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backup = await createBackup(body.scopes as BackupScope[] || []);
    return noStore(NextResponse.json({
      success: true,
      backup: backup.saved,
      envelope: backup.envelope,
    }));
  } catch (error) {
    console.error('Error creating backup:', error);
    return noStore(NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create backup.' },
      { status: 500 }
    ));
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = normalizeBackupSettings(body.settings || body);
    const saved = await saveBackupSettings(settings);
    return noStore(NextResponse.json({ success: true, settings: saved }));
  } catch (error) {
    console.error('Error saving backup settings:', error);
    return noStore(NextResponse.json({ error: 'Failed to save backup settings.' }, { status: 500 }));
  }
}
