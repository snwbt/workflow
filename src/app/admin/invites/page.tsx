'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildInviteLink,
  buildTelegramUrl,
  buildWhatsappUrl,
  defaultInvitationTemplates,
  getChannelTemplate,
  invitationTemplateVars,
  renderInvitationTemplate,
} from '@/lib/invitations';
import type { InvitationChannel, InvitationInviteType, InvitationTemplates, InvitationView } from '@/lib/invitationTypes';
import styles from './page.module.css';

interface InvitationPayload {
  invitations: InvitationView[];
  templates: InvitationTemplates;
  config: Record<string, any>;
}

const emptyForm = {
  guestName: '',
  email: '',
  phone: '',
  telegramUsername: '',
  inviteType: 'saturday_only' as InvitationInviteType,
};

function inviteTypeLabel(value: InvitationInviteType) {
  return value === 'friday_saturday' ? 'Fri + Sat' : 'Sat only';
}

function channelStatus(invite: InvitationView, channel: InvitationChannel) {
  const status = invite.sent?.[channel];
  if (!status?.status || status.status === 'idle') return 'Not sent';
  if (status.status === 'sent') return `Sent${status.sentAt ? ` ${new Date(status.sentAt).toLocaleDateString()}` : ''}`;
  return 'Failed';
}

export default function AdminInvitesPage() {
  const [payload, setPayload] = useState<InvitationPayload | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, InvitationView>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const templates = payload?.templates || defaultInvitationTemplates;
  const config = payload?.config || {};

  const sortedInvitations = useMemo(() => (
    [...(payload?.invitations || [])].sort((a, b) => a.guestName.localeCompare(b.guestName))
  ), [payload?.invitations]);

  const loadInvitations = () => {
    setError('');
    fetch('/api/admin/invitations')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setPayload)
      .catch((err) => setError(`Failed to load invitations: ${err.message}`));
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const saveTemplates = async (nextTemplates: InvitationTemplates) => {
    if (!payload) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: nextTemplates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save templates.');
      setPayload(data);
      setMessage('Templates saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save templates.');
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (key: keyof InvitationTemplates, value: string) => {
    if (!payload?.templates) return;
    setPayload({
      ...payload,
      templates: {
        ...payload.templates,
        [key]: value,
      },
    });
  };

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invitation.');
      loadInvitations();
      setForm(emptyForm);
      setMessage('Invitation created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation.');
    } finally {
      setSaving(false);
    }
  };

  const saveInvitation = async (invite: InvitationView) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation: invite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save invitation.');
      setPayload(data);
      setEditingId('');
      setMessage('Invitation saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invitation.');
    } finally {
      setSaving(false);
    }
  };

  const deleteInvitation = async (invite: InvitationView) => {
    if (!window.confirm(`Delete invitation for ${invite.guestName}?`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/invitations?id=${encodeURIComponent(invite.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete invitation.');
      setPayload(data);
      setMessage('Invitation deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invitation.');
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async (invite: InvitationView) => {
    if (!window.confirm(`Send email invitation to ${invite.guestName}?`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invite.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email.');
      loadInvitations();
      setMessage('Email invitation sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email.');
    } finally {
      setSaving(false);
    }
  };

  const renderMessage = (invite: InvitationView, channel: InvitationChannel) => {
    if (!templates) return '';
    const link = buildInviteLink(origin, invite.inviteCode);
    const vars = invitationTemplateVars(invite, config, link, templates);
    return renderInvitationTemplate(getChannelTemplate(invite, templates, channel), vars);
  };

  const openChat = (invite: InvitationView, channel: 'whatsapp' | 'telegram') => {
    const messageText = renderMessage(invite, channel);
    const url = channel === 'whatsapp'
      ? buildWhatsappUrl(invite.phone || '', messageText)
      : buildTelegramUrl(invite.telegramUsername || '', messageText);
    if (!url) return;
    if (!window.confirm(`Open ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} invite for ${invite.guestName}?`)) return;
    void fetch('/api/admin/invitations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitation: {
          ...invite,
          sent: {
            ...invite.sent,
            [channel]: { status: 'sent', sentAt: new Date().toISOString() },
          },
        },
      }),
    }).then(() => loadInvitations());
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const uploadPhoto = async (file?: File) => {
    if (!file || !templates) return;
    setSaving(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload invite photo.');
      await saveTemplates({ ...templates, photoUrl: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload invite photo.');
    } finally {
      setSaving(false);
    }
  };

  if (!payload) {
    return <div className={styles.container}>{error || 'Loading invitations...'}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Invitations</h1>
          <p>Create tailored invite links, send email invitations, and compose WhatsApp or Telegram messages.</p>
        </div>
        <span className={styles.status}>{saving ? 'Saving...' : 'Ready'}</span>
      </header>

      {(message || error) && (
        <div className={`${styles.notice} ${error ? styles.noticeError : ''}`}>
          {error || message}
        </div>
      )}

      <section className={styles.grid}>
        <form className={styles.panel} onSubmit={createInvitation}>
          <h2>Add Guest</h2>
          <label>
            Guest name
            <input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            WhatsApp phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6591234567" />
          </label>
          <label>
            Telegram username
            <input value={form.telegramUsername} onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })} placeholder="@username" />
          </label>
          <label>
            Invite type
            <select value={form.inviteType} onChange={(e) => setForm({ ...form, inviteType: e.target.value as InvitationInviteType })}>
              <option value="friday_saturday">Friday + Saturday</option>
              <option value="saturday_only">Saturday only</option>
            </select>
          </label>
          <button type="submit" disabled={saving}>Create invitation</button>
        </form>

        <section className={styles.panel}>
          <h2>Templates</h2>
          <label>
            Email subject
            <input value={templates.emailSubject} onChange={(e) => updateTemplate('emailSubject', e.target.value)} />
          </label>
          <label>
            Email message
            <textarea value={templates.emailBody} onChange={(e) => updateTemplate('emailBody', e.target.value)} rows={6} />
          </label>
          <label>
            WhatsApp message
            <textarea value={templates.whatsappMessage} onChange={(e) => updateTemplate('whatsappMessage', e.target.value)} rows={5} />
          </label>
          <label>
            Telegram message
            <textarea value={templates.telegramMessage} onChange={(e) => updateTemplate('telegramMessage', e.target.value)} rows={5} />
          </label>
          <label>
            Invite photo URL
            <input value={templates.photoUrl || ''} onChange={(e) => updateTemplate('photoUrl', e.target.value)} />
          </label>
          <label className={styles.uploadButton}>
            Upload photo
            <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          </label>
          <button type="button" onClick={() => saveTemplates(templates)} disabled={saving}>Save templates</button>
          <p className={styles.helper}>Variables: {'{guestName}'}, {'{inviteLink}'}, {'{coupleNames}'}, {'{fridayVenue}'}, {'{saturdayVenue}'}, {'{rsvpDeadline}'}, {'{photoUrl}'}.</p>
        </section>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <h2>Guest Invites</h2>
          <span>{sortedInvitations.length} guests</span>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Invite</th>
                <th>Contact</th>
                <th>RSVP</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvitations.map((invite) => {
                const draft = drafts[invite.id] || invite;
                const link = buildInviteLink(origin, invite.inviteCode);
                const isEditing = editingId === invite.id;
                return (
                  <tr key={invite.id}>
                    <td>
                      {isEditing ? (
                        <input value={draft.guestName} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, guestName: e.target.value } })} />
                      ) : (
                        <>
                          <strong>{invite.guestName}</strong>
                          <small>{invite.inviteCode}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select value={draft.inviteType} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, inviteType: e.target.value as InvitationInviteType } })}>
                          <option value="friday_saturday">Friday + Saturday</option>
                          <option value="saturday_only">Saturday only</option>
                        </select>
                      ) : inviteTypeLabel(invite.inviteType)}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className={styles.editStack}>
                          <input value={draft.email || ''} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, email: e.target.value } })} placeholder="Email" />
                          <input value={draft.phone || ''} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, phone: e.target.value } })} placeholder="Phone" />
                          <input value={draft.telegramUsername || ''} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, telegramUsername: e.target.value } })} placeholder="Telegram" />
                        </div>
                      ) : (
                        <>
                          <small>{invite.email || '-'}</small>
                          <small>{invite.phone || '-'}</small>
                          <small>{invite.telegramUsername ? `@${invite.telegramUsername}` : '-'}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={invite.rsvpSubmitted ? styles.yesPill : styles.noPill}>
                        {invite.rsvpSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <small>Email: {channelStatus(invite, 'email')}</small>
                      <small>WhatsApp: {channelStatus(invite, 'whatsapp')}</small>
                      <small>Telegram: {channelStatus(invite, 'telegram')}</small>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {isEditing ? (
                          <>
                            <button type="button" onClick={() => saveInvitation(draft)} disabled={saving}>Save</button>
                            <button type="button" onClick={() => setEditingId('')}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => {
                              navigator.clipboard?.writeText(link);
                              setMessage('Invite link copied.');
                            }}>Copy link</button>
                            <button type="button" onClick={() => sendEmail(invite)} disabled={!invite.email || saving}>Email</button>
                            <button type="button" onClick={() => openChat(invite, 'whatsapp')} disabled={!invite.phone}>WhatsApp</button>
                            <button type="button" onClick={() => openChat(invite, 'telegram')} disabled={!invite.telegramUsername}>Telegram</button>
                            <button type="button" onClick={() => {
                              setDrafts({ ...drafts, [invite.id]: invite });
                              setEditingId(invite.id);
                            }}>Edit</button>
                            <button type="button" className={styles.dangerButton} onClick={() => deleteInvitation(invite)}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
