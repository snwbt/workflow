import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { deriveSeatingRoster, normalizeSeatingState, searchAssignedGuests } from '@/lib/seating';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const db = await getDb();
    const seating = normalizeSeatingState(db.seating);
    const roster = deriveSeatingRoster(db);
    const results = searchAssignedGuests(String(query || ''), roster, seating.assignments, seating.floorplan);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching seating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
