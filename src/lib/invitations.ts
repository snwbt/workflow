import type {
  InvitationChannel,
  InvitationInviteType,
  InvitationRecord,
  InvitationState,
  InvitationTemplates,
  InvitationView,
} from './invitationTypes';
import { getCalendarEvents, renderEventDetailsText } from './calendar';

const DEFAULT_EMAIL_BODY = [
  '{inviteGreeting},',
  '',
  'We would be honoured to celebrate with you at our wedding.',
  '',
  '{eventDetails}',
  '',
  'Please RSVP here: {inviteLink}',
  '',
  'With love,',
  '{coupleNames}',
].join('\n');

const DEFAULT_CHAT_BODY = [
  '{inviteGreeting},',
  '',
  'We would be honoured to celebrate with you at our wedding.',
  '',
  '{eventDetails}',
  '',
  'Please RSVP here:',
  '{inviteLink}',
  '',
  '{coupleNames}',
].join('\n');

export const defaultInvitationTemplates: InvitationTemplates = {
  emailSubject: 'Wedding invitation from {coupleNames}',
  emailBody: DEFAULT_EMAIL_BODY,
  whatsappMessage: DEFAULT_CHAT_BODY,
  telegramMessage: DEFAULT_CHAT_BODY,
  photoUrl: '',
};

export function normalizeInvitationState(value: unknown): InvitationState {
  const state = (value || {}) as Partial<InvitationState>;
  return {
    invitations: Array.isArray(state.invitations)
      ? state.invitations.map(normalizeInvitationRecord).filter(Boolean)
      : [],
    templates: {
      ...defaultInvitationTemplates,
      ...(state.templates || {}),
    },
    updatedAt: state.updatedAt,
  };
}

export function normalizeInvitationRecord(value: unknown): InvitationRecord {
  const record = (value || {}) as Partial<InvitationRecord>;
  return {
    id: String(record.id || ''),
    guestName: String(record.guestName || '').trim(),
    plusOneName: String(record.plusOneName || '').trim(),
    email: String(record.email || '').trim(),
    phone: String(record.phone || '').trim(),
    telegramUsername: String(record.telegramUsername || '').trim().replace(/^@/, ''),
    inviteType: isInviteType(record.inviteType) ? record.inviteType : 'saturday_only',
    inviteCode: String(record.inviteCode || '').trim(),
    messageOverrides: record.messageOverrides || {},
    sent: record.sent || {},
    submittedAt: record.submittedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function isInviteType(value: unknown): value is InvitationInviteType {
  return value === 'friday_saturday' || value === 'saturday_only';
}

export function generateInviteCode(name: string, existingCodes: Iterable<string>) {
  const existing = new Set(Array.from(existingCodes).map((code) => code.toLowerCase()));
  const base = String(name || 'guest')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 8)
    .toUpperCase() || 'GUEST';

  let index = 0;
  let code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  while (existing.has(code.toLowerCase())) {
    index += 1;
    code = `${base}${Math.floor(1000 + Math.random() * 9000)}${index}`;
  }
  return code;
}

export function findInvitationByCode(state: InvitationState, code: unknown) {
  const normalized = String(code || '').trim().toLowerCase();
  if (!normalized) return null;
  return state.invitations.find((invite) => invite.inviteCode.toLowerCase() === normalized) || null;
}

export function deriveInvitationViews(state: InvitationState, rsvps: any[] = []): InvitationView[] {
  return state.invitations.map((invite) => {
    const match = rsvps.find((rsvp) => (
      String(rsvp.invite_code || '').trim().toLowerCase() === invite.inviteCode.toLowerCase()
    ));
    const rsvpSubmittedAt = match?.submitted_at || invite.submittedAt;
    return {
      ...invite,
      rsvpSubmitted: Boolean(match || invite.submittedAt),
      rsvpSubmittedAt,
    };
  });
}

export function buildInviteLink(origin: string, inviteCode: string) {
  const base = origin.replace(/\/$/, '');
  return `${base}/?invite=${encodeURIComponent(inviteCode)}#rsvp-form`;
}

export function invitationTemplateVars(
  invite: InvitationRecord,
  config: Record<string, any>,
  inviteLink: string,
  templates: InvitationTemplates
) {
  const guestName = String(invite.guestName || '');
  const plusOneName = String(invite.plusOneName || '').trim();
  const inviteGreeting = plusOneName ? `Dear ${guestName} and ${plusOneName}` : `Dear ${guestName}`;
  const events = getCalendarEvents(invite.inviteType, null, config);
  const eventDetails = renderEventDetailsText(events);
  return {
    guestName,
    plusOneName,
    inviteGreeting,
    inviteLink: String(inviteLink || ''),
    inviteCode: String(invite.inviteCode || ''),
    coupleNames: String(config.COUPLE_NAMES || 'Russell & Siaw Min'),
    fridayVenue: String(config.VENUE_NAME || 'The Westin Singapore'),
    saturdayVenue: String(config.VENUE_DAY_TWO_NAME || 'Church of the Holy Family'),
    rsvpDeadline: String(config.RSVP_DEADLINE_DISPLAY || ''),
    photoUrl: String(templates.photoUrl || ''),
    inviteType: invite.inviteType === 'friday_saturday' ? 'Friday + Saturday' : 'Saturday only',
    eventDetails,
    calendarSummary: eventDetails,
  };
}

export function renderInvitationTemplate(template: string, vars: Record<string, string>) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export function getChannelTemplate(
  invite: InvitationRecord,
  templates: InvitationTemplates,
  channel: InvitationChannel
) {
  const override = invite.messageOverrides?.[channel];
  if (override) return override;
  if (channel === 'email') return templates.emailBody;
  if (channel === 'telegram') return templates.telegramMessage;
  return templates.whatsappMessage;
}

export function buildWhatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
}

export function buildTelegramUrl(username: string, message: string) {
  const clean = username.trim().replace(/^@/, '');
  return clean ? `https://t.me/${encodeURIComponent(clean)}?text=${encodeURIComponent(message)}` : '';
}
