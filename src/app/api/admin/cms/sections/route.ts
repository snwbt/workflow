import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

function readDB() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

function writeDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export async function GET(request: Request) {
  try {
    const db = readDB();
    return NextResponse.json({ sections: db.homepage_sections || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { sections } = await request.json();
    
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Sections must be an array' }, { status: 400 });
    }

    const db = readDB();
    db.homepage_sections = sections;
    writeDB(db);

    return NextResponse.json({ success: true, sections: db.homepage_sections });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
