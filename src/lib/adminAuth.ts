import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'wedding2026';
const MIN_PASSWORD_LENGTH = 8;

interface AdminAuthRecord {
  username: string;
  passwordHash: string;
  salt: string;
  iterations: number;
  keyLength: number;
  digest: string;
  updatedAt?: string;
}

function hashPassword(
  password: string,
  salt = crypto.randomBytes(16).toString('hex'),
  iterations = 210000,
  keyLength = 64,
  digest = 'sha512'
) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, iterations, keyLength, digest)
    .toString('hex');

  return { passwordHash, salt, iterations, keyLength, digest };
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function ensureAdminAuth(): AdminAuthRecord {
  const db = getDb();

  if (!db.config) {
    db.config = {};
  }

  if (!db.config.ADMIN_AUTH?.passwordHash || !db.config.ADMIN_AUTH?.salt) {
    const password = hashPassword(DEFAULT_PASSWORD);
    db.config.ADMIN_AUTH = {
      username: DEFAULT_USERNAME,
      ...password,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
  }

  return db.config.ADMIN_AUTH;
}

export function verifyAdminCredentials(username: string, password: string) {
  const auth = ensureAdminAuth();

  if (username !== auth.username) {
    return false;
  }

  const attempt = hashPassword(
    password,
    auth.salt,
    auth.iterations,
    auth.keyLength,
    auth.digest
  );

  return safeEqual(attempt.passwordHash, auth.passwordHash);
}

export function parseBasicAuthHeader(header: string | null) {
  if (!header?.startsWith('Basic ')) {
    return null;
  }

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');

    if (separator < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function isAdminRequestAuthorized(request: NextRequest | Request) {
  const credentials = parseBasicAuthHeader(request.headers.get('authorization'));

  if (!credentials) {
    return false;
  }

  return verifyAdminCredentials(credentials.username, credentials.password);
}

export function validateNewPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return 'All password fields are required.';
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (newPassword !== confirmPassword) {
    return 'New password and confirmation do not match.';
  }

  if (!verifyAdminCredentials(DEFAULT_USERNAME, currentPassword)) {
    return 'Current password is incorrect.';
  }

  return null;
}

export function updateAdminPassword(newPassword: string) {
  const db = getDb();

  if (!db.config) {
    db.config = {};
  }

  db.config.ADMIN_AUTH = {
    username: DEFAULT_USERNAME,
    ...hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);
}
