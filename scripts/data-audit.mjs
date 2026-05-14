import fs from 'fs';
import {
  decryptDataEnvelope,
  fileExists,
  isEncryptedEnvelope,
  localDbPath,
  printCounts,
  readJsonFile,
  seedDbPath,
  sensitiveCounts,
} from './data-safety.mjs';

function storageMode() {
  if (process.env.DATABASE_URL) return 'DATABASE_URL';
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) return 'seed-readonly';
  return 'local-json';
}

async function auditDatabase() {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const tables = await sql`
    SELECT
      to_regclass('public.site_state') AS site_state,
      to_regclass('public.rsvps') AS rsvps
  `;
  const hasSiteState = Boolean(tables[0]?.site_state);
  const hasRsvpsTable = Boolean(tables[0]?.rsvps);
  const state = {};

  if (hasSiteState) {
    const rows = await sql`
      SELECT key, value
      FROM site_state
      WHERE key IN ('guests', 'invitations', 'seating', 'rsvps', 'rsvps_secure')
    `;
    for (const row of rows) state[row.key] = row.value;
  }

  if (hasRsvpsTable && !state.rsvps && !state.rsvps_secure) {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM rsvps`;
    state.__rsvpsCount = rows[0]?.count || 0;
  }

  const counts = sensitiveCounts(state);
  printCounts('Active database data', counts);

  const encryptedWithoutKey = Object.values(state).some((value) => isEncryptedEnvelope(value))
    && !process.env.DATA_ENCRYPTION_KEY;
  if (encryptedWithoutKey) {
    console.log('  Note: set DATA_ENCRYPTION_KEY to audit encrypted payload counts.');
  }
}

console.log(`Storage mode: ${storageMode()}`);
console.log(`Tracked seed: ${seedDbPath}`);
console.log(`Local runtime DB: ${localDbPath}`);

const seedCounts = sensitiveCounts(readJsonFile(seedDbPath));
printCounts('Tracked seed data', seedCounts);

if (process.env.DATABASE_URL) {
  try {
    await auditDatabase();
  } catch (error) {
    console.error(`Failed to audit DATABASE_URL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
} else if (fileExists(localDbPath)) {
  const localCounts = sensitiveCounts(readJsonFile(localDbPath));
  printCounts('Local runtime data', localCounts);
} else {
  console.log('Local runtime data: not initialized yet.');
}

if (!process.env.DATABASE_URL && fs.existsSync(localDbPath)) {
  const localData = readJsonFile(localDbPath);
  for (const key of ['guests', 'invitations', 'seating', 'rsvps', 'rsvps_secure']) {
    if (isEncryptedEnvelope(localData[key])) {
      try {
        decryptDataEnvelope(localData[key]);
      } catch {
        console.log(`  ${key}: encrypted payload could not be decrypted with current DATA_ENCRYPTION_KEY.`);
      }
    }
  }
}
