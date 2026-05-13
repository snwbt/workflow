import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must contain headers and at least one row' }, { status: 400 });
    }

    // Expected format: Party ID, First Name, Last Name, Max Party Size, Plus One Allowed, Invited Events (semicolon separated)
    const db = await getDb();
    db.guests = db.guests || [];
    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
      const rowLabel = `Row ${i + 1}`;

      // Validate required fields
      if (!parts[0]) { errors.push(`${rowLabel}: Missing Party ID`); continue; }
      if (!parts[1]) { errors.push(`${rowLabel}: Missing First Name`); continue; }
      if (!parts[2]) { errors.push(`${rowLabel}: Missing Last Name`); continue; }

      const party_id = parts[0];
      const first_name = parts[1];
      const last_name = parts[2];
      const max_party_size = parseInt(parts[3]);
      if (parts[3] && isNaN(max_party_size)) {
        errors.push(`${rowLabel}: Max Party Size must be a number`); continue;
      }
      const plus_one_allowed = parts[4] === 'true' || parts[4] === 'TRUE';
      const invited_events = parts[5] ? parts[5].split(';').map(e => e.trim()).filter(Boolean) : ['e1', 'e2'];

      const existingGuest = db.guests.find((g: any) =>
        g.first_name === first_name && g.last_name === last_name && g.party_id === party_id
      );

      if (!existingGuest) {
        db.guests.push({
          guest_id: randomUUID(),
          party_id,
          first_name,
          last_name,
          invite_code_hash: Math.floor(1000 + Math.random() * 9000).toString(),
          plus_one_allowed,
          max_party_size: isNaN(max_party_size) ? 1 : max_party_size,
          invited_events,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        imported++;
      }
    }

    await saveDb(db);

    return NextResponse.json({
      success: true,
      imported,
      skipped: lines.length - 1 - imported - errors.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
