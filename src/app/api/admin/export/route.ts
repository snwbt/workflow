import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    let csv = 'Name,Email,Invite Type,Invite Code,Status,Guest Count,Guest Names,Dinner Attendance,Mass Attendance,Dietary,Accessibility,Message,Custom Answers,Submitted At,Updated At,Source\n';

    (db.rsvps || []).forEach((rsvp: any) => {
      const customAnswers = rsvp.custom_answers
        ? Object.entries(rsvp.custom_answers).map(([key, value]) => `${key}: ${value}`).join(' | ')
        : '';

      csv += [
        quote(rsvp.guest_name),
        quote(rsvp.email),
        quote(rsvp.invite_type),
        quote(rsvp.invite_code),
        quote(rsvp.attendance_status),
        rsvp.guest_count || 0,
        quote(rsvp.additional_guest_names || rsvp.plus_one_name),
        quote(rsvp.dinner_attendance),
        quote(rsvp.mass_attendance),
        quote(rsvp.dietary_restrictions),
        quote(rsvp.accessibility_requirements),
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
