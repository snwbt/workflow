import type {
  InvitationChannel,
  InvitationInviteType,
  InvitationRecord,
  InvitationState,
  InvitationTemplateSet,
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

export const defaultInvitationTemplateSet: InvitationTemplateSet = {
  emailSubject: 'Wedding invitation from {coupleNames}',
  emailBody: DEFAULT_EMAIL_BODY,
  whatsappMessage: DEFAULT_CHAT_BODY,
  telegramMessage: DEFAULT_CHAT_BODY,
  photoUrl: '',
};

export const defaultInvitationTemplates: InvitationTemplates = {
  friday_saturday: { ...defaultInvitationTemplateSet },
  saturday_only: { ...defaultInvitationTemplateSet },
};

export function normalizeInvitationState(value: unknown): InvitationState {
  const state = (value || {}) as Partial<InvitationState>;
  return {
    invitations: Array.isArray(state.invitations)
      ? state.invitations.map(normalizeInvitationRecord).filter(Boolean)
      : [],
    templates: normalizeInvitationTemplates(state.templates),
    updatedAt: state.updatedAt,
  };
}

export function normalizeInvitationTemplates(value: unknown): InvitationTemplates {
  const input = (value || {}) as Partial<InvitationTemplates> & Partial<InvitationTemplateSet>;
  const legacyTemplate: InvitationTemplateSet = {
    ...defaultInvitationTemplateSet,
    ...pickTemplateSet(input),
  };

  return {
    friday_saturday: {
      ...legacyTemplate,
      ...pickTemplateSet(input.friday_saturday),
    },
    saturday_only: {
      ...legacyTemplate,
      ...pickTemplateSet(input.saturday_only),
    },
  };
}

function pickTemplateSet(value: unknown): Partial<InvitationTemplateSet> {
  const input = (value || {}) as Partial<InvitationTemplateSet>;
  return {
    ...(typeof input.emailSubject === 'string' ? { emailSubject: input.emailSubject } : {}),
    ...(typeof input.emailBody === 'string' ? { emailBody: input.emailBody } : {}),
    ...(typeof input.whatsappMessage === 'string' ? { whatsappMessage: input.whatsappMessage } : {}),
    ...(typeof input.telegramMessage === 'string' ? { telegramMessage: input.telegramMessage } : {}),
    ...(typeof input.photoUrl === 'string' ? { photoUrl: input.photoUrl } : {}),
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
  let code = `${base}${randomInviteToken()}`;
  while (existing.has(code.toLowerCase())) {
    index += 1;
    code = `${base}${randomInviteToken()}${index}`;
  }
  return code;
}

function randomInviteToken(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
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
  return `${base}/?invite=${encodeURIComponent(inviteCode)}`;
}

function cleanTemplateVariables(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => /^\w+$/.test(key))
      .map(([key, item]) => [key, String(item ?? '')])
  );
}

export function invitationTemplateVars(
  invite: InvitationRecord,
  config: Record<string, any>,
  inviteLink: string,
  templates: InvitationTemplates
) {
  const templateSet = getInvitationTemplateSet(templates, invite.inviteType);
  const guestName = String(invite.guestName || '');
  const plusOneName = String(invite.plusOneName || '').trim();
  const inviteGreeting = plusOneName ? `Dear ${guestName} and ${plusOneName}` : `Dear ${guestName}`;
  const events = getCalendarEvents(invite.inviteType, null, config);
  const eventDetails = renderEventDetailsText(events);
  const fridayEvent = getCalendarEvents('friday_saturday', null, config).find((event) => event.id === 'friday');
  const saturdayEvent = getCalendarEvents('saturday_only', null, config).find((event) => event.id === 'saturday');
  return {
    ...cleanTemplateVariables(config.INVITE_TEMPLATE_VARIABLES),
    guestName,
    plusOneName,
    inviteGreeting,
    inviteLink: String(inviteLink || ''),
    inviteCode: String(invite.inviteCode || ''),
    coupleNames: String(config.COUPLE_NAMES || 'Russell & Siaw Min'),
    fridayVenue: String(config.VENUE_NAME || 'The Westin Singapore'),
    saturdayVenue: String(config.VENUE_DAY_TWO_NAME || 'Church of the Holy Family'),
    rsvpDeadline: String(config.RSVP_DEADLINE_DISPLAY || ''),
    fridayCalendarTitle: String(fridayEvent?.title || ''),
    fridayCalendarDate: String(config.CALENDAR_FRIDAY_DATE || '23 October 2026'),
    fridayCalendarStart: String(config.CALENDAR_FRIDAY_START_TIME || '6:45 PM'),
    fridayCalendarEnd: String(config.CALENDAR_FRIDAY_END_TIME || '10:30 PM'),
    fridayCalendarLocation: String(fridayEvent?.location || ''),
    fridayCalendarDescription: String(fridayEvent?.description || ''),
    saturdayCalendarTitle: String(saturdayEvent?.title || ''),
    saturdayCalendarDate: String(config.CALENDAR_SATURDAY_DATE || '24 October 2026'),
    saturdayCalendarStart: String(config.CALENDAR_SATURDAY_START_TIME || '10:00 AM'),
    saturdayCalendarEnd: String(config.CALENDAR_SATURDAY_END_TIME || '1:00 PM'),
    saturdayCalendarLocation: String(saturdayEvent?.location || ''),
    saturdayCalendarDescription: String(saturdayEvent?.description || ''),
    photoUrl: String(templateSet.photoUrl || ''),
    inviteType: invite.inviteType === 'friday_saturday' ? 'Friday + Saturday' : 'Saturday only',
    eventDetails,
    calendarSummary: eventDetails,
  };
}

export function getInvitationTemplateSet(
  templates: InvitationTemplates,
  inviteType: InvitationInviteType
): InvitationTemplateSet {
  return templates[inviteType] || templates.saturday_only || defaultInvitationTemplateSet;
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
  const templateSet = getInvitationTemplateSet(templates, invite.inviteType);
  if (channel === 'email') return templateSet.emailBody;
  if (channel === 'telegram') return templateSet.telegramMessage;
  return templateSet.whatsappMessage;
}

export function buildWhatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
}

export function buildTelegramUrl(username: string, message: string) {
  const clean = username.trim().replace(/^@/, '');
  return clean ? `https://t.me/${encodeURIComponent(clean)}?text=${encodeURIComponent(message)}` : '';
}
