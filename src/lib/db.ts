import 'server-only';

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const dbPath = path.join(process.cwd(), 'src/data/db.json');

type SqlClient = ReturnType<typeof neon>;

export interface AdminAuthRecord {
  username: string;
  passwordHash: string;
  salt: string;
  iterations: number;
  keyLength: number;
  digest: string;
  updatedAt?: string;
}

export interface RsvpRecord {
  rsvp_id: string;
  guest_name: string;
  email: string;
  attendance_status: string;
  guest_count?: number;
  plus_one_name?: string;
  meal_preference?: string;
  dietary_restrictions?: string;
  transport_needed?: boolean;
  message?: string;
  custom_answers?: Record<string, unknown>;
  submitted_at?: string;
  updated_at?: string;
  source?: string;
}

let sqlClient: SqlClient | null = null;
let schemaReady = false;
let seedReady = false;

function isVercelRuntime() {
  return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
}

function assertWritableJsonFallback() {
  if (isVercelRuntime()) {
    throw new Error(
      'Persistent database is not configured. Set DATABASE_URL in Vercel to save admin changes.'
    );
  }
}

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!sqlClient) {
    sqlClient = neon(connectionString);
  }

  return sqlClient;
}

function readJsonDbRaw() {
  const fileContents = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(fileContents);
}

function stripPrivateConfig(config: Record<string, unknown> = {}) {
  const publicConfig = { ...config };
  delete publicConfig.ADMIN_AUTH;
  return publicConfig;
}

function normalizeDb(data: any) {
  return {
    ...data,
    config: stripPrivateConfig(data?.config || {}),
    homepage_sections: data?.homepage_sections || [],
    rsvps: data?.rsvps || [],
    guests: data?.guests || [],
    events: data?.events || [],
  };
}

async function ensureSchema(sql: SqlClient) {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS site_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_auth (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL,
      key_length INTEGER NOT NULL,
      digest TEXT NOT NULL,
      updated_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      rsvp_id UUID PRIMARY KEY,
      guest_name TEXT NOT NULL,
      email TEXT NOT NULL,
      attendance_status TEXT NOT NULL,
      guest_count INTEGER NOT NULL DEFAULT 0,
      plus_one_name TEXT,
      meal_preference TEXT,
      dietary_restrictions TEXT,
      transport_needed BOOLEAN NOT NULL DEFAULT FALSE,
      message TEXT,
      custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS rsvps_email_lower_idx ON rsvps (LOWER(email))`;

  schemaReady = true;
}

async function upsertSiteState(sql: SqlClient, key: string, value: unknown) {
  await sql`
    INSERT INTO site_state (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW()
  `;
}

async function insertRsvp(sql: SqlClient, rsvp: RsvpRecord) {
  await sql`
    INSERT INTO rsvps (
      rsvp_id,
      guest_name,
      email,
      attendance_status,
      guest_count,
      plus_one_name,
      meal_preference,
      dietary_restrictions,
      transport_needed,
      message,
      custom_answers,
      submitted_at,
      updated_at,
      source
    )
    VALUES (
      ${rsvp.rsvp_id},
      ${rsvp.guest_name},
      ${rsvp.email},
      ${rsvp.attendance_status},
      ${Number(rsvp.guest_count || 0)},
      ${rsvp.plus_one_name || null},
      ${rsvp.meal_preference || null},
      ${rsvp.dietary_restrictions || null},
      ${Boolean(rsvp.transport_needed)},
      ${rsvp.message || null},
      ${JSON.stringify(rsvp.custom_answers || {})}::jsonb,
      ${rsvp.submitted_at || new Date().toISOString()},
      ${rsvp.updated_at || rsvp.submitted_at || new Date().toISOString()},
      ${rsvp.source || null}
    )
    ON CONFLICT (rsvp_id) DO UPDATE SET
      guest_name = EXCLUDED.guest_name,
      email = EXCLUDED.email,
      attendance_status = EXCLUDED.attendance_status,
      guest_count = EXCLUDED.guest_count,
      plus_one_name = EXCLUDED.plus_one_name,
      meal_preference = EXCLUDED.meal_preference,
      dietary_restrictions = EXCLUDED.dietary_restrictions,
      transport_needed = EXCLUDED.transport_needed,
      message = EXCLUDED.message,
      custom_answers = EXCLUDED.custom_answers,
      submitted_at = EXCLUDED.submitted_at,
      updated_at = EXCLUDED.updated_at,
      source = EXCLUDED.source
  `;
}

async function seedFromJson(sql: SqlClient) {
  if (seedReady) return;

  const siteCountRows = await sql`SELECT COUNT(*)::int AS count FROM site_state` as Array<{ count: number }>;
  const rsvpCountRows = await sql`SELECT COUNT(*)::int AS count FROM rsvps` as Array<{ count: number }>;
  const authCountRows = await sql`SELECT COUNT(*)::int AS count FROM admin_auth` as Array<{ count: number }>;
  const siteCount = siteCountRows[0]?.count || 0;
  const rsvpCount = rsvpCountRows[0]?.count || 0;
  const authCount = authCountRows[0]?.count || 0;

  const seed = readJsonDbRaw();

  if (siteCount === 0) {
    await upsertSiteState(sql, 'config', stripPrivateConfig(seed.config || {}));
    await upsertSiteState(sql, 'homepage_sections', seed.homepage_sections || []);
    await upsertSiteState(sql, 'guests', seed.guests || []);
    await upsertSiteState(sql, 'events', seed.events || []);
  }

  if (rsvpCount === 0) {
    for (const rsvp of seed.rsvps || []) {
      await insertRsvp(sql, rsvp);
    }
  }

  if (authCount === 0 && seed.config?.ADMIN_AUTH) {
    const auth = seed.config.ADMIN_AUTH;
    await saveAdminAuth({
      username: auth.username || 'admin',
      passwordHash: auth.passwordHash,
      salt: auth.salt,
      iterations: auth.iterations,
      keyLength: auth.keyLength,
      digest: auth.digest,
      updatedAt: auth.updatedAt,
    });
  }

  seedReady = true;
}

async function ensureDatabase() {
  const sql = getSql();
  if (!sql) return null;

  await ensureSchema(sql);
  await seedFromJson(sql);
  return sql;
}

function saveJsonDb(data: any) {
  assertWritableJsonFallback();

  const existing = readJsonDbRaw();
  const merged = {
    ...existing,
    ...data,
    config: {
      ...(existing.config || {}),
      ...(data.config || {}),
      ADMIN_AUTH: data.config?.ADMIN_AUTH || existing.config?.ADMIN_AUTH,
    },
  };
  fs.writeFileSync(dbPath, JSON.stringify(merged, null, 2), 'utf8');
}

function saveJsonDbKey(key: string, value: unknown) {
  assertWritableJsonFallback();

  const existing = readJsonDbRaw();
  const merged = {
    ...existing,
    [key]: value,
  };
  fs.writeFileSync(dbPath, JSON.stringify(merged, null, 2), 'utf8');
}

function saveJsonConfig(config: Record<string, unknown>) {
  assertWritableJsonFallback();

  const existing = readJsonDbRaw();
  const merged = {
    ...existing,
    config: {
      ...(existing.config || {}),
      ...config,
      ADMIN_AUTH: existing.config?.ADMIN_AUTH,
    },
  };
  fs.writeFileSync(dbPath, JSON.stringify(merged, null, 2), 'utf8');
}

export async function getDb() {
  const sql = await ensureDatabase();
  if (!sql) {
    return normalizeDb(readJsonDbRaw());
  }

  const stateRows = await sql`SELECT key, value FROM site_state` as Array<{ key: string; value: unknown }>;
  const state = stateRows.reduce((acc: Record<string, unknown>, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  const rsvps = await sql`
    SELECT
      rsvp_id::text,
      guest_name,
      email,
      attendance_status,
      guest_count,
      plus_one_name,
      meal_preference,
      dietary_restrictions,
      transport_needed,
      message,
      custom_answers,
      submitted_at,
      updated_at,
      source
    FROM rsvps
    ORDER BY submitted_at DESC
  ` as Array<Record<string, any>>;

  return normalizeDb({
    config: state.config || {},
    homepage_sections: state.homepage_sections || [],
    guests: state.guests || [],
    events: state.events || [],
    rsvps: rsvps.map((rsvp: any) => ({
      ...rsvp,
      submitted_at: rsvp.submitted_at instanceof Date ? rsvp.submitted_at.toISOString() : rsvp.submitted_at,
      updated_at: rsvp.updated_at instanceof Date ? rsvp.updated_at.toISOString() : rsvp.updated_at,
    })),
  });
}

export async function saveDb(data: any) {
  const sql = await ensureDatabase();
  if (!sql) {
    saveJsonDb(data);
    return;
  }

  await upsertSiteState(sql, 'config', stripPrivateConfig(data.config || {}));
  await upsertSiteState(sql, 'homepage_sections', data.homepage_sections || []);
  await upsertSiteState(sql, 'guests', data.guests || []);
  await upsertSiteState(sql, 'events', data.events || []);

  await sql`DELETE FROM rsvps`;
  for (const rsvp of data.rsvps || []) {
    await insertRsvp(sql, rsvp);
  }
}

export async function saveConfig(config: Record<string, unknown>) {
  const sql = await ensureDatabase();
  const publicConfig = stripPrivateConfig(config || {});

  if (!sql) {
    saveJsonConfig(publicConfig);
    return publicConfig;
  }

  await upsertSiteState(sql, 'config', publicConfig);
  return publicConfig;
}

export async function mergeConfig(config: Record<string, unknown>) {
  const db = await getDb();
  const nextConfig = {
    ...(db.config || {}),
    ...stripPrivateConfig(config || {}),
  };

  return saveConfig(nextConfig);
}

export async function saveHomepageSections(sections: unknown[]) {
  const sql = await ensureDatabase();

  if (!sql) {
    saveJsonDbKey('homepage_sections', sections);
    return sections;
  }

  await upsertSiteState(sql, 'homepage_sections', sections || []);
  return sections || [];
}

export async function saveGuests(guests: unknown[]) {
  const sql = await ensureDatabase();

  if (!sql) {
    saveJsonDbKey('guests', guests);
    return guests;
  }

  await upsertSiteState(sql, 'guests', guests || []);
  return guests || [];
}

export async function saveRsvps(rsvps: RsvpRecord[]) {
  const sql = await ensureDatabase();

  if (!sql) {
    saveJsonDbKey('rsvps', rsvps);
    return rsvps;
  }

  await sql`DELETE FROM rsvps`;
  for (const rsvp of rsvps || []) {
    await insertRsvp(sql, rsvp);
  }
  return rsvps || [];
}

export async function saveRsvp(rsvp: RsvpRecord) {
  const sql = await ensureDatabase();

  if (!sql) {
    const db = readJsonDbRaw();
    const rsvps = db.rsvps || [];
    const index = rsvps.findIndex((item: RsvpRecord) => item.rsvp_id === rsvp.rsvp_id);

    if (index >= 0) {
      rsvps[index] = rsvp;
    } else {
      rsvps.push(rsvp);
    }

    saveJsonDbKey('rsvps', rsvps);
    return rsvp;
  }

  await insertRsvp(sql, rsvp);
  return rsvp;
}

export async function deleteRsvp(rsvpId: string) {
  const sql = await ensureDatabase();

  if (!sql) {
    const db = readJsonDbRaw();
    const rsvps = db.rsvps || [];
    const nextRsvps = rsvps.filter((rsvp: RsvpRecord) => rsvp.rsvp_id !== rsvpId);

    if (nextRsvps.length === rsvps.length) return false;

    saveJsonDbKey('rsvps', nextRsvps);
    return true;
  }

  const deleted = await sql`
    DELETE FROM rsvps
    WHERE rsvp_id = ${rsvpId}
    RETURNING rsvp_id
  ` as Array<{ rsvp_id: string }>;
  return deleted.length > 0;
}

export async function getAdminAuth() {
  const sql = await ensureDatabase();
  if (!sql) {
    const auth = readJsonDbRaw().config?.ADMIN_AUTH;
    return auth
      ? {
          username: auth.username,
          passwordHash: auth.passwordHash,
          salt: auth.salt,
          iterations: auth.iterations,
          keyLength: auth.keyLength,
          digest: auth.digest,
          updatedAt: auth.updatedAt,
        }
      : null;
  }

  const rows = await sql`
    SELECT
      username,
      password_hash AS "passwordHash",
      salt,
      iterations,
      key_length AS "keyLength",
      digest,
      updated_at AS "updatedAt"
    FROM admin_auth
    WHERE username = 'admin'
    LIMIT 1
  ` as Array<Omit<AdminAuthRecord, 'updatedAt'> & { updatedAt?: string | Date }>;

  const auth = rows[0];
  if (!auth) return null;

  return {
    ...auth,
    updatedAt: auth.updatedAt instanceof Date ? auth.updatedAt.toISOString() : auth.updatedAt,
  };
}

export async function saveAdminAuth(auth: AdminAuthRecord) {
  const sql = getSql();
  if (!sql) {
    assertWritableJsonFallback();
    const db = readJsonDbRaw();
    db.config = {
      ...(db.config || {}),
      ADMIN_AUTH: auth,
    };
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    return;
  }

  await ensureSchema(sql);
  await sql`
    INSERT INTO admin_auth (
      username,
      password_hash,
      salt,
      iterations,
      key_length,
      digest,
      updated_at
    )
    VALUES (
      ${auth.username},
      ${auth.passwordHash},
      ${auth.salt},
      ${auth.iterations},
      ${auth.keyLength},
      ${auth.digest},
      ${auth.updatedAt || new Date().toISOString()}
    )
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      salt = EXCLUDED.salt,
      iterations = EXCLUDED.iterations,
      key_length = EXCLUDED.key_length,
      digest = EXCLUDED.digest,
      updated_at = EXCLUDED.updated_at
  `;
}
