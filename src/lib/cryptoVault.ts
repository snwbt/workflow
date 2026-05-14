import 'server-only';

import crypto from 'crypto';

export interface EncryptedEnvelope {
  encrypted: true;
  version: 1;
  alg: 'AES-256-GCM';
  keyId: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

type KeyPurpose = 'data' | 'backup';

const ALGORITHM = 'aes-256-gcm';

function rawKeyForPurpose(purpose: KeyPurpose) {
  if (purpose === 'backup') {
    return process.env.BACKUP_ENCRYPTION_KEY
      || (process.env.ALLOW_BACKUP_KEY_FALLBACK === '1' ? process.env.DATA_ENCRYPTION_KEY : undefined);
  }

  return process.env.DATA_ENCRYPTION_KEY;
}

function deriveKey(rawKey: string) {
  const trimmed = rawKey.trim();
  const maybeHex = /^[a-f0-9]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : null;
  const maybeBase64 = !maybeHex && /^[A-Za-z0-9+/=]+$/.test(trimmed) ? Buffer.from(trimmed, 'base64') : null;
  const candidate = maybeHex || maybeBase64;

  if (candidate?.length === 32) return candidate;
  return crypto.createHash('sha256').update(trimmed).digest();
}

function getKey(purpose: KeyPurpose) {
  const rawKey = rawKeyForPurpose(purpose);
  if (!rawKey) {
    throw new Error(purpose === 'backup'
      ? 'BACKUP_ENCRYPTION_KEY is required for encrypted backups.'
      : 'DATA_ENCRYPTION_KEY is required for encrypted data storage.');
  }

  const key = deriveKey(rawKey);
  const keyId = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
  return { key, keyId };
}

export function hasDataEncryptionKey() {
  return Boolean(process.env.DATA_ENCRYPTION_KEY);
}

export function hasBackupEncryptionKey() {
  return Boolean(process.env.BACKUP_ENCRYPTION_KEY || (process.env.ALLOW_BACKUP_KEY_FALLBACK === '1' && process.env.DATA_ENCRYPTION_KEY));
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  const envelope = value as Partial<EncryptedEnvelope>;
  return Boolean(
    envelope
      && envelope.encrypted === true
      && envelope.version === 1
      && envelope.alg === 'AES-256-GCM'
      && typeof envelope.iv === 'string'
      && typeof envelope.tag === 'string'
      && typeof envelope.ciphertext === 'string'
  );
}

export function encryptJson(value: unknown, purpose: KeyPurpose): EncryptedEnvelope {
  const { key, keyId } = getKey(purpose);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value ?? null), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: true,
    version: 1,
    alg: 'AES-256-GCM',
    keyId,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptJson<T = unknown>(envelope: EncryptedEnvelope, purpose: KeyPurpose): T {
  const { key } = getKey(purpose);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8')) as T;
}

export function encryptDataIfConfigured(value: unknown) {
  if (isEncryptedEnvelope(value)) return value;
  return hasDataEncryptionKey() ? encryptJson(value, 'data') : value;
}

export function decryptDataIfNeeded<T = unknown>(value: unknown): T {
  return isEncryptedEnvelope(value) ? decryptJson<T>(value, 'data') : value as T;
}
