import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/data/db.json');

export function getDb() {
  const fileContents = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(fileContents);
}

export function saveDb(data: any) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}
