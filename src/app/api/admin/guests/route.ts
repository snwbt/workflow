import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

// GET: Return all RSVP submissions (open model — no guests array)
export async function GET() {
  try {
    const db = getDb();
    const rsvps = db.rsvps || [];
    return NextResponse.json(rsvps);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Admin edits an RSVP submission by rsvp_id
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { rsvp_id, attendance_status, meal_preference, dietary_restrictions, guest_count, plus_one_name, transport_needed, message } = body;

    if (!rsvp_id) {
      return NextResponse.json({ error: 'rsvp_id is required' }, { status: 400 });
    }

    const db = getDb();
    const rsvps = db.rsvps || [];
    const idx = rsvps.findIndex((r: any) => r.rsvp_id === rsvp_id);

    if (idx < 0) {
      return NextResponse.json({ error: 'RSVP not found' }, { status: 404 });
    }

    // Merge updates
    rsvps[idx] = {
      ...rsvps[idx],
      ...(attendance_status !== undefined && { attendance_status }),
      ...(meal_preference !== undefined && { meal_preference }),
      ...(dietary_restrictions !== undefined && { dietary_restrictions }),
      ...(guest_count !== undefined && { guest_count }),
      ...(plus_one_name !== undefined && { plus_one_name }),
      ...(transport_needed !== undefined && { transport_needed }),
      ...(message !== undefined && { message }),
      updated_at: new Date().toISOString(),
    };

    db.rsvps = rsvps;
    saveDb(db);

    return NextResponse.json({ success: true, rsvp: rsvps[idx] });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Admin removes an RSVP submission
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rsvp_id = searchParams.get('rsvp_id');

    if (!rsvp_id) {
      return NextResponse.json({ error: 'rsvp_id is required' }, { status: 400 });
    }

    const db = getDb();
    const before = (db.rsvps || []).length;
    db.rsvps = (db.rsvps || []).filter((r: any) => r.rsvp_id !== rsvp_id);

    if (db.rsvps.length === before) {
      return NextResponse.json({ error: 'RSVP not found' }, { status: 404 });
    }

    saveDb(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting RSVP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
