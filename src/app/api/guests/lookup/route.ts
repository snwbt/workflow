import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// In-memory rate limiting for MVP
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rateLimitInfo = rateLimitMap.get(ip) || { count: 0, resetTime: now + 10 * 60 * 1000 };

    if (now > rateLimitInfo.resetTime) {
      rateLimitInfo.count = 0;
      rateLimitInfo.resetTime = now + 10 * 60 * 1000;
    }

    if (rateLimitInfo.count >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later or contact the couple.' },
        { status: 429 }
      );
    }

    const { firstName, lastName, inviteCode } = await request.json();

    if (!firstName || !lastName || !inviteCode) {
      return NextResponse.json(
        { error: 'First name, last name, and invite code are required.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // In a real app, inviteCode would be hashed and compared.
    // Here we'll just check if it matches "1234" for the mock since we stored "1234" as hash for MVP
    const guest = (db.guests || []).find(
      (g: any) =>
        g.first_name.toLowerCase() === firstName.toLowerCase().trim() &&
        g.last_name.toLowerCase() === lastName.toLowerCase().trim() &&
        g.invite_code_hash === inviteCode.trim()
    );

    if (!guest) {
      // Increment rate limit
      rateLimitInfo.count += 1;
      rateLimitMap.set(ip, rateLimitInfo);

      // Generic error as per PRD
      return NextResponse.json(
        { error: "We couldn't find your invitation. Please check your details or contact the couple." },
        { status: 404 }
      );
    }

    // Reset rate limit on success
    rateLimitMap.delete(ip);

    // Find all members of this guest's party
    const party = (db.guests || []).filter((g: any) => g.party_id === guest.party_id);
    
    // Check if an RSVP already exists for this party
    const existingRsvp = db.rsvps.find((r: any) => r.party_id === guest.party_id) || null;

    return NextResponse.json({ 
      party, 
      existingRsvp,
      config: db.config 
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
