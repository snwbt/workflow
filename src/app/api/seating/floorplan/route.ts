import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeSeatingState } from '@/lib/seating';

export async function GET() {
  try {
    const db = await getDb();
    const seating = normalizeSeatingState(db.seating);

    return NextResponse.json({ floorplan: seating.floorplan });
  } catch (error) {
    console.error('Error fetching public seating floorplan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
