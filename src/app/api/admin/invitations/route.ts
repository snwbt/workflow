import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb, saveInvitations } from '@/lib/db';
import {
  deriveInvitationViews,
  generateInviteCode,
  isInviteType,
  normalizeInvitationState,
  normalizeInvitationTemplates,
} from '@/lib/invitations';
import type { InvitationRecord, InvitationTemplates } from '@/lib/invitationTypes';
import { normalizeInvitationImportRows, previewInvitationImport } from '@/lib/invitationImport';

function cleanString(value: unknown) {
  return String(value || '').trim();
}

function sanitizeInvitation(input: Partial<InvitationRecord>, existingCodes: Iterable<string>, existing?: InvitationRecord): InvitationRecord {
  const now = new Date().toISOString();
  const guestName = cleanString(input.guestName || existing?.guestName);
  const inviteCode = cleanString(input.inviteCode || existing?.inviteCode)
    || generateInviteCode(guestName, existingCodes);

  return {
    id: cleanString(input.id || existing?.id) || randomUUID(),
    guestName,
    plusOneName: cleanString(input.plusOneName ?? existing?.plusOneName),
    email: cleanString(input.email ?? existing?.email),
    phone: cleanString(input.phone ?? existing?.phone),
    telegramUsername: cleanString(input.telegramUsername ?? existing?.telegramUsername).replace(/^@/, ''),
    inviteType: isInviteType(input.inviteType) ? input.inviteType : existing?.inviteType || 'saturday_only',
    inviteCode,
    messageOverrides: input.messageOverrides ?? existing?.messageOverrides ?? {},
    sent: input.sent ?? existing?.sent ?? {},
    submittedAt: input.submittedAt ?? existing?.submittedAt,
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);
    return NextResponse.json({
      ...state,
      invitations: deriveInvitationViews(state, db.rsvps || []),
      config: db.config || {},
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to load invitations.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);
    const invite = sanitizeInvitation(body.invitation || body, state.invitations.map((item) => item.inviteCode));

    if (!invite.guestName) {
      return NextResponse.json({ error: 'Guest name is required.' }, { status: 400 });
    }

    const nextState = await saveInvitations({
      ...state,
      invitations: [...state.invitations, invite],
    });

    return NextResponse.json({
      success: true,
      invitation: deriveInvitationViews(nextState, db.rsvps || []).find((item) => item.id === invite.id),
      templates: nextState.templates,
      config: db.config || {},
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);

    const nextTemplates: InvitationTemplates = body.templates
      ? normalizeInvitationTemplates(body.templates)
      : state.templates;

    let nextInvitations = state.invitations;
    const input = body.invitation as Partial<InvitationRecord> | undefined;

    if (body.importRows) {
      const rows = normalizeInvitationImportRows(body.importRows);
      const preview = previewInvitationImport(rows, state.invitations);
      if (body.previewOnly) {
        return NextResponse.json({ success: true, preview });
      }

      const validRows = preview.filter((row) => row.action !== 'invalid');
      nextInvitations = state.invitations;
      validRows.forEach((row) => {
        const existingCodes = nextInvitations
          .filter((item) => item.id !== row.matchId)
          .map((item) => item.inviteCode);
        const sanitized = sanitizeInvitation(row.invitation, existingCodes, nextInvitations.find((item) => item.id === row.matchId));
        nextInvitations = row.matchId
          ? nextInvitations.map((item) => item.id === row.matchId ? sanitized : item)
          : [...nextInvitations, sanitized];
      });
    }

    if (input?.id) {
      const existing = state.invitations.find((item) => item.id === input.id);
      if (!existing) {
        return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
      }

      nextInvitations = state.invitations.map((item) => (
        item.id === input.id
          ? sanitizeInvitation(input, state.invitations.filter((other) => other.id !== input.id).map((other) => other.inviteCode), item)
          : item
      ));
    }

    const nextState = await saveInvitations({
      invitations: nextInvitations,
      templates: nextTemplates,
    });

    return NextResponse.json({
      success: true,
      ...nextState,
      invitations: deriveInvitationViews(nextState, db.rsvps || []),
      config: db.config || {},
    });
  } catch (error) {
    console.error('Error updating invitation:', error);
    return NextResponse.json({ error: 'Failed to update invitation.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map(cleanString).filter(Boolean) : [];
    if (id) ids.push(id);
    if (ids.length === 0) return NextResponse.json({ error: 'At least one invitation id is required.' }, { status: 400 });

    const db = await getDb();
    const state = normalizeInvitationState(db.invitations);
    const idSet = new Set(ids);
    const nextInvitations = state.invitations.filter((item) => !idSet.has(item.id));

    if (nextInvitations.length === state.invitations.length) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const nextState = await saveInvitations({
      ...state,
      invitations: nextInvitations,
    });

    return NextResponse.json({
      success: true,
      ...nextState,
      invitations: deriveInvitationViews(nextState, db.rsvps || []),
      config: db.config || {},
    });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json({ error: 'Failed to delete invitation.' }, { status: 500 });
  }
}
