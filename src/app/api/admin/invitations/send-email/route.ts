import { NextResponse } from 'next/server';
import { getDb, saveInvitations } from '@/lib/db';
import { sendInvitationEmail } from '@/lib/email';
import {
  buildInviteLink,
  deriveInvitationViews,
  getChannelTemplate,
  invitationTemplateVars,
  normalizeInvitationState,
  renderInvitationTemplate,
} from '@/lib/invitations';
import { getCalendarEvents, renderCalendarEmailHtml } from '@/lib/calendar';

export async function POST(request: Request) {
  try {
    const { id, ids } = await request.json();
    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);
    const requestedIds = Array.isArray(ids) ? ids : id ? [id] : [];

    if (requestedIds.length === 0) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invites = state.invitations.filter((item) => requestedIds.includes(item.id));
    if (invites.length === 0) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invites.length === 1 && !invites[0].email) {
      return NextResponse.json({ error: 'This guest does not have an email address.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const coupleNames = db.config?.COUPLE_NAMES || 'Russell & Siaw Min';
    const scheduleConfig = (db.homepage_sections || []).find((section: any) => section.type === 'schedule');
    const results = [];
    const nextInvitations = [...state.invitations];

    for (const invite of invites) {
      if (!invite.email) {
        results.push({ id: invite.id, success: false, error: 'Missing email address.' });
        continue;
      }

      const inviteLink = buildInviteLink(origin, invite.inviteCode);
      const vars = invitationTemplateVars(invite, db.config || {}, inviteLink, state.templates);
      const subject = renderInvitationTemplate(state.templates.emailSubject, vars);
      const message = renderInvitationTemplate(getChannelTemplate(invite, state.templates, 'email'), vars);
      const calendarHtml = renderCalendarEmailHtml(getCalendarEvents(invite.inviteType, scheduleConfig, db.config || {}));

      try {
        await sendInvitationEmail(invite.email, subject, message, coupleNames, calendarHtml);
        invite.sent = {
          ...invite.sent,
          email: { status: 'sent', sentAt: new Date().toISOString() },
        };
        results.push({ id: invite.id, success: true });
      } catch (error) {
        invite.sent = {
          ...invite.sent,
          email: {
            status: 'failed',
            sentAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Failed to send email.',
          },
        };
        results.push({ id: invite.id, success: false, error: invite.sent.email?.error || 'Failed to send email.' });
      }

      const index = nextInvitations.findIndex((item) => item.id === invite.id);
      if (index >= 0) nextInvitations[index] = invite;
    }

    const nextState = await saveInvitations({
      ...state,
      invitations: nextInvitations,
    });

    const sent = results.every((result) => result.success);
    return NextResponse.json({
      success: sent,
      results,
      invitations: deriveInvitationViews(nextState, db.rsvps || []),
      invitation: id ? deriveInvitationViews(nextState, db.rsvps || []).find((item) => item.id === id) : undefined,
      error: sent ? undefined : 'Some email invitations failed.',
    });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json({ error: 'Failed to send invitation email.' }, { status: 500 });
  }
}
