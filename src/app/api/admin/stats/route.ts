import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const rsvps = db.rsvps || [];
    let totalResponses = rsvps.length;
    let totalAttending = 0;
    let totalDeclined = 0;
    
    const inviteCounts: Record<string, number> = {};
    let dietaryRestrictionsCount = 0;
    let accessibilityRequirementsCount = 0;
    
    rsvps.forEach((rsvp: any) => {
      if (rsvp.attendance_status === 'attending') {
        totalAttending += rsvp.guest_count || 1;

        const inviteType = rsvp.invite_type || 'unassigned';
        inviteCounts[inviteType] = (inviteCounts[inviteType] || 0) + 1;
        
        if (rsvp.dietary_restrictions && rsvp.dietary_restrictions.trim() !== '') {
          dietaryRestrictionsCount++;
        }

        if (rsvp.accessibility_requirements && rsvp.accessibility_requirements.trim() !== '') {
          accessibilityRequirementsCount++;
        }
      } else if (rsvp.attendance_status === 'declined') {
        totalDeclined += rsvp.guest_count || 1;
      }
    });

    return NextResponse.json({
      totalResponses,
      totalAttending,
      totalDeclined,
      inviteCounts,
      dietaryRestrictionsCount,
      accessibilityRequirementsCount,
      rsvps // Include raw rsvps for the dashboard table
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
