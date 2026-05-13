import { NextResponse } from 'next/server';
import { getDb, saveHomepageSections } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({ sections: db.homepage_sections || [] });
  } catch (error) {
    console.error('Error reading homepage sections:', error);
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { sections } = await request.json();
    
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Sections must be an array' }, { status: 400 });
    }

    const savedSections = await saveHomepageSections(sections);

    return NextResponse.json({ success: true, sections: savedSections });
  } catch (error) {
    console.error('Error updating homepage sections:', error);
    const message = error instanceof Error ? error.message : 'Failed to update database';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
