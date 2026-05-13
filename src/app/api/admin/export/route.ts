import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    let csv = 'Name,Email,Status,Guest Count,Plus One Name,Meal,Dietary,Transport Needed,Message,Custom Answers,Submitted At,Updated At,Source\n';

    (db.rsvps || []).forEach((rsvp: any) => {
      const customAnswers = rsvp.custom_answers
        ? Object.entries(rsvp.custom_answers).map(([key, value]) => `${key}: ${value}`).join(' | ')
        : '';

      csv += [
        quote(rsvp.guest_name),
        quote(rsvp.email),
        quote(rsvp.attendance_status),
        rsvp.guest_count || 0,
        quote(rsvp.plus_one_name),
        quote(rsvp.meal_preference),
        quote(rsvp.dietary_restrictions),
        rsvp.transport_needed ? 'Yes' : 'No',
        quote(rsvp.message),
        quote(customAnswers),
        quote(rsvp.submitted_at),
        quote(rsvp.updated_at),
        quote(rsvp.source),
      ].join(',') + '\n';
    });

    const response = new NextResponse(csv);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', 'attachment; filename="wedding_guests_export.csv"');

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
