import { printCounts, readJsonFile, seedDbPath, sensitiveCounts } from './data-safety.mjs';

const counts = sensitiveCounts(readJsonFile(seedDbPath));
const dirtyCounts = [
  ['RSVP submissions', counts.rsvps],
  ['Guest roster rows', counts.guests],
  ['Invite tracker rows', counts.invitations],
  ['Seating assignments', counts.seatingAssignments],
].filter(([, count]) => count > 0);

printCounts('Tracked seed data', counts);

if (counts.encryptedSensitivePayloads.length > 0) {
  console.error(`Tracked seed contains encrypted sensitive payloads: ${counts.encryptedSensitivePayloads.join(', ')}`);
  process.exitCode = 1;
}

if (dirtyCounts.length > 0) {
  console.error('Tracked seed is not clean. Clear these live-data records before committing:');
  for (const [label, count] of dirtyCounts) {
    console.error(`  ${label}: ${count}`);
  }
  process.exitCode = 1;
}
