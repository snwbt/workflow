import { NextResponse } from 'next/server';
import { getDb, saveRsvp } from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendRsvpConfirmation, sendAdminNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { 
      guest_name, 
      email, 
      attendance_status, 
      invite_code,
      invite_type,
      guest_count, 
      plus_one_name, 
      additional_guest_names,
      dinner_attendance,
      mass_attendance,
      meal_preference, 
      dietary_restrictions, 
      accessibility_requirements,
      transport_needed, 
      message, 
      custom_answers,
      source 
    } = payload;

    if (!guest_name || !email || !attendance_status || !invite_code || !invite_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check deadline
    if (db.config?.RSVP_DEADLINE && new Date(db.config.RSVP_DEADLINE) < new Date()) {
      return NextResponse.json({ error: 'RSVP deadline has passed.' }, { status: 400 });
    }

    const normalizeCode = (value: unknown) => String(value || '').trim().toLowerCase();
    const fridaySaturdayCode = normalizeCode(db.config?.RSVP_INVITE_CODE_FRIDAY_SATURDAY || 'FRISAT');
    const saturdayOnlyCode = normalizeCode(db.config?.RSVP_INVITE_CODE_SATURDAY || 'SATURDAY');
    const submittedCode = normalizeCode(invite_code);
    const resolvedInviteType = submittedCode === fridaySaturdayCode
      ? 'friday_saturday'
      : submittedCode === saturdayOnlyCode
        ? 'saturday_only'
        : '';

    if (!resolvedInviteType || resolvedInviteType !== invite_type) {
      return NextResponse.json({ error: 'Please enter a valid invite code.' }, { status: 400 });
    }

    if (attendance_status === 'attending') {
      const attendingCount = Number(guest_count || 0);
      if (!Number.isInteger(attendingCount) || attendingCount < 1 || attendingCount > 4) {
        return NextResponse.json({ error: 'Please select the number of guests attending.' }, { status: 400 });
      }

      if (resolvedInviteType === 'friday_saturday' && !dinner_attendance) {
        return NextResponse.json({ error: 'Please confirm dinner reception attendance.' }, { status: 400 });
      }

      if (!mass_attendance) {
        return NextResponse.json({ error: 'Please confirm solemnisation Mass attendance.' }, { status: 400 });
      }
    }

    // Initialize rsvps array if missing
    if (!db.rsvps) {
      db.rsvps = [];
    }

    // Check if email already RSVP'd to prevent duplicates (optional, but good for open forms)
    const existingIndex = db.rsvps.findIndex((r: any) => r.email.toLowerCase() === email.toLowerCase());

    const newRsvp = {
      rsvp_id: existingIndex >= 0 ? db.rsvps[existingIndex].rsvp_id : randomUUID(),
      guest_name,
      email,
      attendance_status,
      invite_code,
      invite_type: resolvedInviteType,
      guest_count: attendance_status === 'attending' ? Number(guest_count || 1) : 0,
      plus_one_name,
      additional_guest_names,
      dinner_attendance: resolvedInviteType === 'friday_saturday' ? dinner_attendance : '',
      mass_attendance,
      meal_preference,
      dietary_restrictions,
      accessibility_requirements,
      transport_needed,
      message,
      custom_answers: custom_answers || {},
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: source || 'guest'
    };

    if (existingIndex >= 0) {
      db.rsvps[existingIndex] = newRsvp;
    } else {
      db.rsvps.push(newRsvp);
    }

    await saveRsvp(newRsvp);

    // Format details for email
    let detailsStr = '';
    if (attendance_status === 'attending') {
      detailsStr += `Invite Type: ${resolvedInviteType === 'friday_saturday' ? 'Friday + Saturday' : 'Saturday only'}\n`;
      detailsStr += `Guest Count: ${guest_count}\n`;
      if (plus_one_name) detailsStr += `Plus One: ${plus_one_name}\n`;
      if (additional_guest_names) detailsStr += `Additional Guests: ${additional_guest_names}\n`;
      if (resolvedInviteType === 'friday_saturday') detailsStr += `Dinner Reception: ${dinner_attendance || 'No response'}\n`;
      detailsStr += `Solemnisation Mass: ${mass_attendance || 'No response'}\n`;
      if (dietary_restrictions) detailsStr += `Dietary Restrictions: ${dietary_restrictions}\n`;
      if (accessibility_requirements) detailsStr += `Accessibility Requirements: ${accessibility_requirements}\n`;
      if (custom_answers && Object.keys(custom_answers).length > 0) {
        detailsStr += '\nAdditional Details:\n';
        Object.entries(custom_answers).forEach(([q, a]) => {
          detailsStr += `- ${q}: ${a}\n`;
        });
      }
    }
    if (message) detailsStr += `\nNote to couple: ${message}\n`;

    const coupleNames = db.config?.COUPLE_NAMES || 'Russell & Siaw Min';

    // Send emails asynchronously (don't block the response)
    Promise.all([
      sendRsvpConfirmation(email, guest_name, attendance_status, detailsStr, coupleNames),
      sendAdminNotification(guest_name, attendance_status, detailsStr)
    ]).catch(console.error);

    return NextResponse.json({ success: true, rsvp: newRsvp });
  } catch (error) {
    console.error('RSVP submission error:', error);
    return NextResponse.json({ error: 'Failed to submit RSVP' }, { status: 500 });
  }
}
