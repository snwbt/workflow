import { NextResponse } from 'next/server';
import { getDb, saveSeating } from '@/lib/db';
import {
  deriveSeatingRoster,
  normalizeSeatingState,
  sanitizeAssignments,
  validateSeatingAssignments,
} from '@/lib/seating';

export async function GET() {
  try {
    const db = await getDb();
    const seating = normalizeSeatingState(db.seating);
    const roster = deriveSeatingRoster(db);
    const conflicts = validateSeatingAssignments(seating.assignments, roster, seating.floorplan);
    const assignedPeople = new Set(seating.assignments.map((assignment) => assignment.personId));

    return NextResponse.json({
      floorplan: seating.floorplan,
      assignments: seating.assignments,
      roster,
      conflicts,
      summary: {
        totalSeats: seating.floorplan.tables.reduce((sum, table) => sum + table.seats.length, 0),
        totalPeople: roster.length,
        assignedPeople: roster.filter((person) => assignedPeople.has(person.id)).length,
      },
    });
  } catch (error) {
    console.error('Error fetching admin seating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const current = normalizeSeatingState(db.seating);
    const roster = deriveSeatingRoster(db);
    const assignments = sanitizeAssignments(body.assignments || []);
    const conflicts = validateSeatingAssignments(assignments, roster, current.floorplan);

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Please resolve seating conflicts before saving.', conflicts },
        { status: 400 }
      );
    }

    const seating = await saveSeating({
      ...current,
      assignments,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, seating });
  } catch (error) {
    console.error('Error saving admin seating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
