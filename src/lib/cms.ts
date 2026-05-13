import fs from 'fs';
import path from 'path';

export interface SectionConfig {
  id: string;
  type: string;
  enabled: boolean;
  heading: string;
  bodyCopy: string;
  mediaUrl?: string;
  motionPreset?: string;
}

export function getPublishedSections(): SectionConfig[] {
  try {
    const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    return db.homepage_sections || [];
  } catch (error) {
    return [];
  }
}
