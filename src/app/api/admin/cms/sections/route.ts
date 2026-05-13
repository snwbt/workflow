import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = await getDb();
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

    const db = await getDb();
    db.homepage_sections = sections;
    await saveDb(db);

    return NextResponse.json({ success: true, sections: db.homepage_sections });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
