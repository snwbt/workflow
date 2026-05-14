import 'server-only';

import fs from 'fs';
import path from 'path';
import { del, get, list, put } from '@vercel/blob';
import { getDb, saveBackupSettings, saveGuests, saveInvitations, saveRsvps, saveSeating } from './db';
import { decryptJson, encryptJson, hasBackupEncryptionKey, type EncryptedEnvelope } from './cryptoVault';
import { normalizeInvitationState } from './invitations';
import { normalizeSeatingState } from './seating';

export type BackupScope = 'rsvps' | 'guests' | 'invitations' | 'seating';
export type BackupInterval = 'hourly' | 'six_hours' | 'daily' | 'weekly';

export interface BackupSettings {
  enabled: boolean;
  interval: BackupInterval;
  scopes: BackupScope[];
  retentionCount: number;
  lastRunAt?: string;
}

export interface BackupEnvelope {
  backupVersion: 1;
  createdAt: string;
  appDataVersion: 1;
  scopes: BackupScope[];
  payload: EncryptedEnvelope;
}

export interface BackupListItem {
  id: string;
  filename: string;
  createdAt: string;
  scopes: BackupScope[];
  size: number;
  storage: 'blob' | 'local';
  url?: string;
}

const allScopes: BackupScope[] = ['rsvps', 'guests', 'invitations', 'seating'];
const backupPrefix = 'backups/';
const localBackupDir = path.join(process.cwd(), 'backups');

export const defaultBackupSettings: BackupSettings = {
  enabled: false,
  interval: 'daily',
  scopes: allScopes,
  retentionCount: 30,
};

export function normalizeBackupSettings(value: unknown): BackupSettings {
  const input = (value || {}) as Partial<BackupSettings>;
  const scopes = Array.isArray(input.scopes)
    ? input.scopes.filter((scope): scope is BackupScope => allScopes.includes(scope as BackupScope))
    : defaultBackupSettings.scopes;

  return {
    enabled: Boolean(input.enabled),
    interval: ['hourly', 'six_hours', 'daily', 'weekly'].includes(String(input.interval))
      ? input.interval as BackupInterval
      : defaultBackupSettings.interval,
    scopes: scopes.length ? scopes : defaultBackupSettings.scopes,
    retentionCount: Math.max(1, Math.min(200, Number(input.retentionCount || defaultBackupSettings.retentionCount))),
    lastRunAt: input.lastRunAt,
  };
}

export function backupStorageMode() {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' as const : 'local' as const;
}

function assertBackupKey() {
  if (!hasBackupEncryptionKey()) {
    throw new Error('BACKUP_ENCRYPTION_KEY is required before creating or restoring encrypted backups.');
  }
}

function backupFileName(createdAt: string) {
  return `wedding-backup-${createdAt.replace(/[:.]/g, '-')}.json`;
}

function pickBackupData(db: any, scopes: BackupScope[]) {
  const data: Record<BackupScope, unknown> = {} as Record<BackupScope, unknown>;
  if (scopes.includes('rsvps')) data.rsvps = db.rsvps || [];
  if (scopes.includes('guests')) data.guests = db.guests || [];
  if (scopes.includes('invitations')) data.invitations = normalizeInvitationState(db.invitations);
  if (scopes.includes('seating')) data.seating = normalizeSeatingState(db.seating);
  return data;
}

function ensureLocalBackupDir() {
  if (!fs.existsSync(localBackupDir)) {
    fs.mkdirSync(localBackupDir, { recursive: true });
  }
}

async function saveBackupEnvelope(envelope: BackupEnvelope) {
  const filename = backupFileName(envelope.createdAt);
  const serialized = JSON.stringify(envelope, null, 2);

  if (backupStorageMode() === 'blob') {
    const blob = await put(`${backupPrefix}${filename}`, serialized, {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return { filename, url: blob.url, size: Buffer.byteLength(serialized), storage: 'blob' as const };
  }

  ensureLocalBackupDir();
  fs.writeFileSync(path.join(localBackupDir, filename), serialized, 'utf8');
  return { filename, size: Buffer.byteLength(serialized), storage: 'local' as const };
}

function metadataFromEnvelope(filename: string, envelope: BackupEnvelope, size: number, storage: 'blob' | 'local', url?: string): BackupListItem {
  return {
    id: storage === 'blob' ? filename : filename,
    filename,
    createdAt: envelope.createdAt,
    scopes: envelope.scopes,
    size,
    storage,
    url,
  };
}

export async function listBackups(): Promise<BackupListItem[]> {
  if (backupStorageMode() === 'blob') {
    const result = await list({ prefix: backupPrefix, limit: 1000 });
    const items = await Promise.all(result.blobs.map(async (blob) => {
      try {
        const stored = await get(blob.pathname, { access: 'private', useCache: false });
        const text = stored?.stream ? await new Response(stored.stream).text() : '';
        const envelope = JSON.parse(text) as BackupEnvelope;
        return {
          ...metadataFromEnvelope(blob.pathname.replace(backupPrefix, ''), envelope, blob.size, 'blob', blob.url),
          id: blob.pathname,
        };
      } catch {
        return {
          id: blob.pathname,
          filename: blob.pathname.replace(backupPrefix, ''),
          createdAt: blob.uploadedAt.toISOString(),
          scopes: [] as BackupScope[],
          size: blob.size,
          storage: 'blob' as const,
          url: blob.url,
        };
      }
    }));
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (!fs.existsSync(localBackupDir)) return [];
  return fs.readdirSync(localBackupDir)
    .filter((filename) => filename.endsWith('.json'))
    .map((filename) => {
      const filePath = path.join(localBackupDir, filename);
      const stat = fs.statSync(filePath);
      try {
        const envelope = JSON.parse(fs.readFileSync(filePath, 'utf8')) as BackupEnvelope;
        return metadataFromEnvelope(filename, envelope, stat.size, 'local');
      } catch {
        return {
          id: filename,
          filename,
          createdAt: stat.mtime.toISOString(),
          scopes: [] as BackupScope[],
          size: stat.size,
          storage: 'local' as const,
        };
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function enforceRetention(retentionCount: number) {
  const backups = await listBackups();
  const extra = backups.slice(retentionCount);
  if (extra.length === 0) return;

  if (backupStorageMode() === 'blob') {
    await del(extra.map((item) => item.id));
    return;
  }

  for (const item of extra) {
    fs.rmSync(path.join(localBackupDir, item.filename), { force: true });
  }
}

export async function createBackup(scopes: BackupScope[], options: { enforceRetentionCount?: number } = {}) {
  assertBackupKey();
  const validScopes = scopes.filter((scope): scope is BackupScope => allScopes.includes(scope));
  const selectedScopes = validScopes.length ? validScopes : allScopes;
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const envelope: BackupEnvelope = {
    backupVersion: 1,
    createdAt,
    appDataVersion: 1,
    scopes: selectedScopes,
    payload: encryptJson(pickBackupData(db, selectedScopes), 'backup'),
  };
  const saved = await saveBackupEnvelope(envelope);

  if (options.enforceRetentionCount) {
    await enforceRetention(options.enforceRetentionCount);
  }

  return { envelope, saved };
}

export function previewBackup(envelope: BackupEnvelope) {
  assertBackupKey();
  if (envelope.backupVersion !== 1 || !Array.isArray(envelope.scopes)) {
    throw new Error('Unsupported backup file.');
  }

  const data = decryptJson<Record<string, unknown>>(envelope.payload, 'backup');
  return {
    createdAt: envelope.createdAt,
    scopes: envelope.scopes,
    counts: {
      rsvps: Array.isArray(data.rsvps) ? data.rsvps.length : undefined,
      guests: Array.isArray(data.guests) ? data.guests.length : undefined,
      invitations: Array.isArray((data.invitations as any)?.invitations) ? (data.invitations as any).invitations.length : undefined,
      seatingAssignments: Array.isArray((data.seating as any)?.assignments) ? (data.seating as any).assignments.length : undefined,
    },
  };
}

export async function restoreBackup(envelope: BackupEnvelope, scopes: BackupScope[]) {
  assertBackupKey();
  const availableScopes = envelope.scopes || [];
  const selectedScopes = scopes.filter((scope): scope is BackupScope => availableScopes.includes(scope));
  if (selectedScopes.length === 0) throw new Error('Select at least one backup scope to restore.');
  const data = decryptJson<Record<BackupScope, unknown>>(envelope.payload, 'backup');

  if (selectedScopes.includes('rsvps')) await saveRsvps(Array.isArray(data.rsvps) ? data.rsvps as any[] : []);
  if (selectedScopes.includes('guests')) await saveGuests(Array.isArray(data.guests) ? data.guests : []);
  if (selectedScopes.includes('invitations')) await saveInvitations(normalizeInvitationState(data.invitations));
  if (selectedScopes.includes('seating')) await saveSeating(normalizeSeatingState(data.seating));

  return selectedScopes;
}

function intervalMs(interval: BackupInterval) {
  if (interval === 'hourly') return 60 * 60 * 1000;
  if (interval === 'six_hours') return 6 * 60 * 60 * 1000;
  if (interval === 'weekly') return 7 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

export function isBackupDue(settings: BackupSettings, now = new Date()) {
  if (!settings.enabled) return false;
  if (!settings.lastRunAt) return true;
  return now.getTime() - new Date(settings.lastRunAt).getTime() >= intervalMs(settings.interval);
}

export async function runScheduledBackup() {
  const db = await getDb();
  const settings = normalizeBackupSettings(db.backup_settings);
  if (!isBackupDue(settings)) {
    return { ran: false, settings };
  }

  const backup = await createBackup(settings.scopes, { enforceRetentionCount: settings.retentionCount });
  const nextSettings = {
    ...settings,
    lastRunAt: backup.envelope.createdAt,
  };
  await saveBackupSettings(nextSettings);
  return { ran: true, settings: nextSettings, backup: backup.saved };
}

export async function readStoredBackup(id: string) {
  if (backupStorageMode() === 'blob') {
    const blob = await get(id, { access: 'private', useCache: false });
    if (!blob?.stream) throw new Error('Backup not found.');
    const text = await new Response(blob.stream).text();
    return JSON.parse(text) as BackupEnvelope;
  }

  const filePath = path.join(localBackupDir, path.basename(id));
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as BackupEnvelope;
}
