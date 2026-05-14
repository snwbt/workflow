import type { InvitationInviteType, InvitationRecord } from './invitationTypes';
import { generateInviteCode, isInviteType } from './invitations';

export interface InvitationImportRow {
  guestName?: string;
  plusOneName?: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
  inviteType?: InvitationInviteType | string;
  inviteCode?: string;
}

export interface InvitationImportPreviewRow {
  rowNumber: number;
  invitation: Partial<InvitationRecord>;
  action: 'create' | 'update' | 'invalid';
  matchId?: string;
  errors: string[];
}

const COLUMN_ALIASES: Record<string, keyof InvitationImportRow> = {
  guestname: 'guestName',
  name: 'guestName',
  fullname: 'guestName',
  full_name: 'guestName',
  plusonename: 'plusOneName',
  plusone: 'plusOneName',
  plus_one_name: 'plusOneName',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  whatsapp: 'phone',
  whatsappphone: 'phone',
  telegram: 'telegramUsername',
  telegramusername: 'telegramUsername',
  telegram_username: 'telegramUsername',
  invitetype: 'inviteType',
  invite_type: 'inviteType',
  invitecode: 'inviteCode',
  invite_code: 'inviteCode',
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function normalizeKey(value: unknown) {
  return clean(value).replace(/[^a-z0-9_]+/gi, '').toLowerCase();
}

function normalizeMatch(value: unknown) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

function normalizeInviteType(value: unknown): InvitationInviteType | '' {
  const source = normalizeMatch(value).replace(/[\s_+-]+/g, '');
  if (source === 'fridaysaturday' || source === 'frisat' || source === 'both') return 'friday_saturday';
  if (source === 'saturdayonly' || source === 'satonly' || source === 'saturday') return 'saturday_only';
  return isInviteType(value) ? value : '';
}

export function normalizeInvitationImportRows(rows: Record<string, unknown>[]): InvitationImportRow[] {
  return rows.map((row) => {
    const normalized: InvitationImportRow = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const field = COLUMN_ALIASES[normalizeKey(key)];
      if (!field) return;
      normalized[field] = clean(value) as never;
    });
    return normalized;
  });
}

function findMatch(row: InvitationImportRow, invitations: InvitationRecord[]) {
  const code = normalizeMatch(row.inviteCode);
  const email = normalizeMatch(row.email);
  const phone = clean(row.phone).replace(/\D/g, '');
  const guestName = normalizeMatch(row.guestName);

  return invitations.find((invite) => (
    (code && normalizeMatch(invite.inviteCode) === code) ||
    (email && normalizeMatch(invite.email) === email) ||
    (phone && clean(invite.phone).replace(/\D/g, '') === phone) ||
    (guestName && normalizeMatch(invite.guestName) === guestName)
  ));
}

export function previewInvitationImport(rows: InvitationImportRow[], invitations: InvitationRecord[]) {
  const usedCodes = new Set(invitations.map((invite) => normalizeMatch(invite.inviteCode)).filter(Boolean));

  return rows.map<InvitationImportPreviewRow>((row, index) => {
    const guestName = clean(row.guestName);
    const inviteType = normalizeInviteType(row.inviteType) || 'saturday_only';
    const match = findMatch(row, invitations);
    const requestedCode = clean(row.inviteCode || match?.inviteCode || '');
    const inviteCode = requestedCode || generateInviteCode(guestName, usedCodes);
    usedCodes.add(normalizeMatch(inviteCode));

    const errors = [
      !guestName ? 'Guest name is required.' : '',
      row.inviteType && !normalizeInviteType(row.inviteType) ? 'Invite type must be friday_saturday or saturday_only.' : '',
    ].filter(Boolean);

    return {
      rowNumber: index + 2,
      action: errors.length > 0 ? 'invalid' : match ? 'update' : 'create',
      matchId: match?.id,
      errors,
      invitation: {
        id: match?.id,
        guestName,
        plusOneName: clean(row.plusOneName),
        email: clean(row.email),
        phone: clean(row.phone),
        telegramUsername: clean(row.telegramUsername).replace(/^@/, ''),
        inviteType,
        inviteCode,
      },
    };
  });
}
