import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    
    let csv = 'Party ID,Guest Name,RSVP Status,Attending Count,Meal Choice,Dietary Restrictions,Plus-One Name,Invited Events,Submitted At,Updated At,Invite Code\n';
    
    db.guests.forEach((guest: any) => {
      let rsvpStatus = 'pending';
      let attendingCount = 0;
      let mealChoice = '';
      let dietaryRestrictions = '';
      let plusOneName = '';
      let submittedAt = '';
      let updatedAt = '';
      
      const rsvp = db.rsvps.find((r: any) => r.party_id === guest.party_id);
      if (rsvp) {
        submittedAt = rsvp.submitted_at || '';
        updatedAt = rsvp.updated_at || '';
        
        // Count attending in this party
        attendingCount = rsvp.attendees.filter((a: any) => a.attendance_status === 'attending').length;

        const attendeeData = rsvp.attendees.find((a: any) => a.guest_id === guest.guest_id);
        if (attendeeData) {
          rsvpStatus = attendeeData.attendance_status;
          mealChoice = attendeeData.meal_choice || '';
          dietaryRestrictions = attendeeData.dietary_restrictions || '';
        }

        // Find if they brought a plus one
        const plusOne = rsvp.attendees.find((a: any) => a.is_plus_one);
        if (plusOne && plusOne.attendance_status === 'attending') {
          plusOneName = plusOne.name;
        }
      }

      // Escape quotes for CSV
      const name = `"${guest.first_name} ${guest.last_name}"`;
      const dietary = `"${dietaryRestrictions.replace(/"/g, '""')}"`;
      const plusOneStr = `"${plusOneName.replace(/"/g, '""')}"`;
      const eventsStr = `"${(guest.invited_events || []).join(';')}"`;

      csv += `${guest.party_id},${name},${rsvpStatus},${attendingCount},${mealChoice},${dietary},${plusOneStr},${eventsStr},${submittedAt},${updatedAt},${guest.invite_code_hash}\n`;
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
