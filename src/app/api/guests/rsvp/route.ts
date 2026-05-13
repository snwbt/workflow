import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendRsvpConfirmation, sendAdminNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { 
      guest_name, 
      email, 
      attendance_status, 
      guest_count, 
      plus_one_name, 
      meal_preference, 
      dietary_restrictions, 
      transport_needed, 
      message, 
      custom_answers,
      source 
    } = payload;

    if (!guest_name || !email || !attendance_status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    
    // Check deadline
    if (db.config?.RSVP_DEADLINE && new Date(db.config.RSVP_DEADLINE) < new Date()) {
      return NextResponse.json({ error: 'RSVP deadline has passed.' }, { status: 400 });
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
      guest_count,
      plus_one_name,
      meal_preference,
      dietary_restrictions,
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

    saveDb(db);

    // Format details for email
    let detailsStr = '';
    if (attendance_status === 'attending') {
      detailsStr += `Guest Count: ${guest_count}\n`;
      if (plus_one_name) detailsStr += `Plus One: ${plus_one_name}\n`;
      if (meal_preference) detailsStr += `Meal Preference: ${meal_preference}\n`;
      if (dietary_restrictions) detailsStr += `Dietary Restrictions: ${dietary_restrictions}\n`;
      if (transport_needed) detailsStr += `Transport Needed: Yes\n`;
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
