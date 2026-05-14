import 'server-only';

import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getAdminAuth, saveAdminAuth, type AdminAuthRecord } from '@/lib/db';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'wedding2026';
const MIN_PASSWORD_LENGTH = 12;

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
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

export async function ensureAdminAuth(): Promise<AdminAuthRecord> {
  const existing = await getAdminAuth();
  if (existing?.passwordHash && existing?.salt) {
    return existing;
  }

  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || (!isProductionRuntime() ? DEFAULT_PASSWORD : '');
  if (!initialPassword) {
    throw new Error('Admin password is not configured. Set ADMIN_INITIAL_PASSWORD before first production sign-in.');
  }

  const auth: AdminAuthRecord = {
    username: process.env.ADMIN_USERNAME || DEFAULT_USERNAME,
    ...hashPassword(initialPassword),
    updatedAt: new Date().toISOString(),
  };

  await saveAdminAuth(auth);
  return auth;
}

export async function verifyAdminCredentials(username: string, password: string) {
  const auth = await ensureAdminAuth();

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

export async function isAdminRequestAuthorized(request: NextRequest | Request) {
  const credentials = parseBasicAuthHeader(request.headers.get('authorization'));

  if (!credentials) {
    return false;
  }

  return verifyAdminCredentials(credentials.username, credentials.password);
}

export async function validateNewPassword(
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

  const auth = await ensureAdminAuth();
  if (!(await verifyAdminCredentials(auth.username, currentPassword))) {
    return 'Current password is incorrect.';
  }

  return null;
}

export async function updateAdminPassword(newPassword: string) {
  await saveAdminAuth({
    username: DEFAULT_USERNAME,
    ...hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  });
}
