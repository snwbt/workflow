import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { findInvitationByCode, normalizeInvitationState } from '@/lib/invitations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);
    const invite = findInvitationByCode(state, code);

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    return NextResponse.json({
      guestName: invite.guestName,
      email: invite.email || '',
      inviteType: invite.inviteType,
      inviteCode: invite.inviteCode,
    });
  } catch (error) {
    console.error('Error loading invitation prefill:', error);
    return NextResponse.json({ error: 'Failed to load invitation.' }, { status: 500 });
  }
}
