import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const seedDbPath = path.join(process.cwd(), 'src/data/db.json');
export const localDbPath = path.join(process.cwd(), 'data/local-db.json');

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

export function isEncryptedEnvelope(value) {
  return Boolean(
    value
      && value.encrypted === true
      && value.version === 1
      && value.alg === 'AES-256-GCM'
      && typeof value.iv === 'string'
      && typeof value.tag === 'string'
      && typeof value.ciphertext === 'string'
  );
}

function deriveKey(rawKey) {
  const trimmed = String(rawKey || '').trim();
  const maybeHex = /^[a-f0-9]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : null;
  const maybeBase64 = !maybeHex && /^[A-Za-z0-9+/=]+$/.test(trimmed) ? Buffer.from(trimmed, 'base64') : null;
  const candidate = maybeHex || maybeBase64;

  if (candidate?.length === 32) return candidate;
  return crypto.createHash('sha256').update(trimmed).digest();
}

export function decryptDataEnvelope(value) {
  if (!isEncryptedEnvelope(value)) return value;
  if (!process.env.DATA_ENCRYPTION_KEY) return value;

  const key = deriveKey(process.env.DATA_ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8'));
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

export function sensitiveCounts(data) {
  const encryptedSensitivePayloads = [];
  const guests = decryptDataEnvelope(data?.guests);
  const rsvps = decryptDataEnvelope(data?.rsvps);
  const rsvpsSecure = decryptDataEnvelope(data?.rsvps_secure);
  const invitations = decryptDataEnvelope(data?.invitations);
  const seating = decryptDataEnvelope(data?.seating);

  for (const [key, value] of Object.entries({ guests, rsvps, rsvps_secure: rsvpsSecure, invitations, seating })) {
    if (isEncryptedEnvelope(value)) encryptedSensitivePayloads.push(key);
  }

  return {
    rsvps: Number(data?.__rsvpsCount ?? 0) || countArray(rsvpsSecure) || countArray(rsvps),
    guests: Number(data?.__guestsCount ?? 0) || countArray(guests),
    invitations: Number(data?.__invitationsCount ?? 0) || countArray(invitations?.invitations),
    seatingAssignments: Number(data?.__seatingAssignmentsCount ?? 0) || countArray(seating?.assignments),
    encryptedSensitivePayloads,
  };
}

export function printCounts(label, counts) {
  console.log(`${label}:`);
  console.log(`  RSVP submissions: ${counts.rsvps}`);
  console.log(`  Guest roster rows: ${counts.guests}`);
  console.log(`  Invite tracker rows: ${counts.invitations}`);
  console.log(`  Seating assignments: ${counts.seatingAssignments}`);
  if (counts.encryptedSensitivePayloads.length > 0) {
    console.log(`  Encrypted payloads not counted: ${counts.encryptedSensitivePayloads.join(', ')}`);
  }
}
