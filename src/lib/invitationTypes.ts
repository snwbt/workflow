export type InvitationChannel = 'email' | 'whatsapp' | 'telegram';
export type InvitationSendStatus = 'idle' | 'sent' | 'failed';
export type InvitationInviteType = 'friday_saturday' | 'saturday_only';

export interface InvitationSendRecord {
  status: InvitationSendStatus;
  sentAt?: string;
  error?: string;
}

export interface InvitationRecord {
  id: string;
  guestName: string;
  plusOneName?: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
  inviteType: InvitationInviteType;
  inviteCode: string;
  messageOverrides?: Partial<Record<InvitationChannel, string>>;
  sent?: Partial<Record<InvitationChannel, InvitationSendRecord>>;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvitationTemplateSet {
  emailSubject: string;
  emailBody: string;
  whatsappMessage: string;
  telegramMessage: string;
  photoUrl?: string;
}

export type InvitationTemplates = Record<InvitationInviteType, InvitationTemplateSet>;

export interface InvitationState {
  invitations: InvitationRecord[];
  templates: InvitationTemplates;
  updatedAt?: string;
}

export interface InvitationView extends InvitationRecord {
  rsvpSubmitted: boolean;
  rsvpSubmittedAt?: string;
}
