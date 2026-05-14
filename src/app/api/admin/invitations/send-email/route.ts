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
    const { id } = await request.json();
    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);
    const invite = state.invitations.find((item) => item.id === id);

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (!invite.email) {
      return NextResponse.json({ error: 'This guest does not have an email address.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const inviteLink = buildInviteLink(origin, invite.inviteCode);
    const vars = invitationTemplateVars(invite, db.config || {}, inviteLink, state.templates);
    const subject = renderInvitationTemplate(state.templates.emailSubject, vars);
    const message = renderInvitationTemplate(getChannelTemplate(invite, state.templates, 'email'), vars);
    const coupleNames = db.config?.COUPLE_NAMES || 'Russell & Siaw Min';
    const scheduleConfig = (db.homepage_sections || []).find((section: any) => section.type === 'schedule');
    const calendarHtml = renderCalendarEmailHtml(getCalendarEvents(invite.inviteType, scheduleConfig, db.config || {}));

    try {
      await sendInvitationEmail(invite.email, subject, message, coupleNames, calendarHtml);
      invite.sent = {
        ...invite.sent,
        email: { status: 'sent', sentAt: new Date().toISOString() },
      };
    } catch (error) {
      invite.sent = {
        ...invite.sent,
        email: {
          status: 'failed',
          sentAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Failed to send email.',
        },
      };
    }

    const nextState = await saveInvitations({
      ...state,
      invitations: state.invitations.map((item) => item.id === invite.id ? invite : item),
    });

    const sent = invite.sent?.email?.status === 'sent';
    return NextResponse.json({
      success: sent,
      invitation: deriveInvitationViews(nextState, db.rsvps || []).find((item) => item.id === invite.id),
      error: sent ? undefined : invite.sent?.email?.error || 'Failed to send email.',
    }, { status: sent ? 200 : 500 });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json({ error: 'Failed to send invitation email.' }, { status: 500 });
  }
}
