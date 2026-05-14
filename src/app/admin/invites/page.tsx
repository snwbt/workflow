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
import type { InvitationImportPreviewRow } from '@/lib/invitationImport';
import styles from './page.module.css';

interface InvitationPayload {
  invitations: InvitationView[];
  templates: InvitationTemplates;
  config: Record<string, any>;
}

const emptyForm = {
  guestName: '',
  plusOneName: '',
  email: '',
  phone: '',
  telegramUsername: '',
  inviteType: 'saturday_only' as InvitationInviteType,
};

function inviteTypeLabel(value: InvitationInviteType) {
  return value === 'friday_saturday' ? 'Fri + Sat' : 'Sat only';
}

const templateSections: { inviteType: InvitationInviteType; title: string; description: string }[] = [
  {
    inviteType: 'friday_saturday',
    title: 'Fri + Sat templates',
    description: 'Used for guests invited to both Friday dinner and Saturday Mass.',
  },
  {
    inviteType: 'saturday_only',
    title: 'Saturday only templates',
    description: 'Used for guests invited to the Saturday celebration only.',
  },
];

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importPreview, setImportPreview] = useState<InvitationImportPreviewRow[]>([]);
  const [chatQueue, setChatQueue] = useState<{ channel: 'whatsapp' | 'telegram'; invites: InvitationView[]; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const templates = payload?.templates || defaultInvitationTemplates;
  const config = payload?.config || {};

  const sortedInvitations = useMemo(() => (
    [...(payload?.invitations || [])].sort((a, b) => a.guestName.localeCompare(b.guestName))
  ), [payload?.invitations]);
  const allSelected = sortedInvitations.length > 0 && sortedInvitations.every((invite) => selectedIds.has(invite.id));
  const selectedInvitations = sortedInvitations.filter((invite) => selectedIds.has(invite.id));

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

  const updateTemplate = (inviteType: InvitationInviteType, key: keyof InvitationTemplates[InvitationInviteType], value: string) => {
    if (!payload?.templates) return;
    setPayload({
      ...payload,
      templates: {
        ...payload.templates,
        [inviteType]: {
          ...payload.templates[inviteType],
          [key]: value,
        },
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
    await deleteInvitations([invite.id]);
  };

  const deleteInvitations = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete invitations.');
      setPayload(data);
      setSelectedIds(new Set());
      setMessage(ids.length === 1 ? 'Invitation deleted.' : `${ids.length} invitations deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invitations.');
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!window.confirm(`Delete ${ids.length} selected invitation${ids.length === 1 ? '' : 's'}?`)) return;
    void deleteInvitations(ids);
  };

  const sendEmail = async (inviteOrInvites: InvitationView | InvitationView[]) => {
    const invites = Array.isArray(inviteOrInvites) ? inviteOrInvites : [inviteOrInvites];
    const withEmail = invites.filter((invite) => invite.email);
    if (withEmail.length === 0) {
      setError('No selected guests have email addresses.');
      return;
    }
    if (!window.confirm(`Send email invitation to ${withEmail.length === 1 ? withEmail[0].guestName : `${withEmail.length} selected guests`}?`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: withEmail.map((invite) => invite.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email.');
      if (Array.isArray(data.invitations)) {
        setPayload((current) => current ? { ...current, invitations: data.invitations } : current);
      } else {
        loadInvitations();
      }
      const failed = Array.isArray(data.results) ? data.results.filter((result: any) => !result.success).length : 0;
      setMessage(failed > 0
        ? `${withEmail.length - failed} email invitation${withEmail.length - failed === 1 ? '' : 's'} sent, ${failed} failed.`
        : withEmail.length === 1 ? 'Email invitation sent.' : `${withEmail.length} email invitations sent.`);
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

  const startChatQueue = (channel: 'whatsapp' | 'telegram') => {
    const eligible = selectedInvitations.filter((invite) => channel === 'whatsapp' ? invite.phone : invite.telegramUsername);
    if (eligible.length === 0) {
      setError(`No selected guests have ${channel === 'whatsapp' ? 'WhatsApp phone numbers' : 'Telegram usernames'}.`);
      return;
    }
    if (!window.confirm(`Prepare ${eligible.length} ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} invite${eligible.length === 1 ? '' : 's'}?`)) return;
    setChatQueue({ channel, invites: eligible, index: 0 });
  };

  const sendQueuedChat = () => {
    if (!chatQueue) return;
    const invite = chatQueue.invites[chatQueue.index];
    if (!invite) return;
    const messageText = renderMessage(invite, chatQueue.channel);
    const url = chatQueue.channel === 'whatsapp'
      ? buildWhatsappUrl(invite.phone || '', messageText)
      : buildTelegramUrl(invite.telegramUsername || '', messageText);
    if (!url) return;

    void fetch('/api/admin/invitations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitation: {
          ...invite,
          sent: {
            ...invite.sent,
            [chatQueue.channel]: { status: 'sent', sentAt: new Date().toISOString() },
          },
        },
      }),
    }).then(() => loadInvitations());
    window.open(url, '_blank', 'noopener,noreferrer');
    const nextIndex = chatQueue.index + 1;
    setChatQueue(nextIndex >= chatQueue.invites.length ? null : { ...chatQueue, index: nextIndex });
  };

  const previewImportRows = async (rows: Record<string, unknown>[]) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importRows: rows, previewOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview import.');
      setImportRows(rows);
      setImportPreview(data.preview || []);
      setMessage(`Parsed ${rows.length} invitee row${rows.length === 1 ? '' : 's'}. Review before importing.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview import.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      await previewImportRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read import file.');
      setSaving(false);
    }
  };

  const commitImport = async () => {
    if (importRows.length === 0) return;
    const validCount = importPreview.filter((row) => row.action !== 'invalid').length;
    if (!window.confirm(`Import ${validCount} valid invitee row${validCount === 1 ? '' : 's'}?`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importRows, previewOnly: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import invitees.');
      setPayload(data);
      setImportRows([]);
      setImportPreview([]);
      setMessage(`${validCount} invitee row${validCount === 1 ? '' : 's'} imported.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import invitees.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (inviteType: InvitationInviteType, file?: File) => {
    if (!file || !templates) return;
    setSaving(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload invite photo.');
      await saveTemplates({
        ...templates,
        [inviteType]: {
          ...templates[inviteType],
          photoUrl: data.url,
        },
      });
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
            Plus-one guest name
            <input value={form.plusOneName} onChange={(e) => setForm({ ...form, plusOneName: e.target.value })} placeholder="Optional" />
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
          <div className={styles.templateGrid}>
            {templateSections.map((section) => {
              const template = templates[section.inviteType];
              return (
                <div key={section.inviteType} className={styles.templateSet}>
                  <div>
                    <h3>{section.title}</h3>
                    <p>{section.description}</p>
                  </div>
                  <label>
                    Email subject
                    <input value={template.emailSubject} onChange={(e) => updateTemplate(section.inviteType, 'emailSubject', e.target.value)} />
                  </label>
                  <label>
                    Email message
                    <textarea value={template.emailBody} onChange={(e) => updateTemplate(section.inviteType, 'emailBody', e.target.value)} rows={6} />
                  </label>
                  <label>
                    WhatsApp message
                    <textarea value={template.whatsappMessage} onChange={(e) => updateTemplate(section.inviteType, 'whatsappMessage', e.target.value)} rows={5} />
                  </label>
                  <label>
                    Telegram message
                    <textarea value={template.telegramMessage} onChange={(e) => updateTemplate(section.inviteType, 'telegramMessage', e.target.value)} rows={5} />
                  </label>
                  <label>
                    Invite photo URL
                    <input value={template.photoUrl || ''} onChange={(e) => updateTemplate(section.inviteType, 'photoUrl', e.target.value)} />
                  </label>
                  <label className={styles.uploadButton}>
                    Upload photo
                    <input type="file" accept="image/*" onChange={(e) => uploadPhoto(section.inviteType, e.target.files?.[0])} />
                  </label>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => saveTemplates(templates)} disabled={saving}>Save templates</button>
          <p className={styles.helper}>Variables: {'{inviteGreeting}'}, {'{guestName}'}, {'{plusOneName}'}, {'{inviteLink}'}, {'{eventDetails}'}, {'{calendarSummary}'}, {'{coupleNames}'}, {'{fridayVenue}'}, {'{saturdayVenue}'}, {'{rsvpDeadline}'}.</p>
        </section>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <h2>Import Invitees</h2>
          <label className={styles.uploadButton}>
            Upload Excel / CSV
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleImportFile(e.target.files?.[0])} />
          </label>
        </div>
        <p className={styles.helper}>Columns: guestName, email, plusOneName, phone, telegramUsername, inviteType, inviteCode. Duplicates update by invite code, then email, phone, and guest name.</p>
        {importPreview.length > 0 && (
          <>
            <div className={styles.importSummary}>
              <span>{importPreview.filter((row) => row.action === 'create').length} create</span>
              <span>{importPreview.filter((row) => row.action === 'update').length} update</span>
              <span>{importPreview.filter((row) => row.action === 'invalid').length} invalid</span>
              <button type="button" onClick={commitImport} disabled={saving || importPreview.every((row) => row.action === 'invalid')}>Import valid rows</button>
              <button type="button" onClick={() => { setImportRows([]); setImportPreview([]); }}>Clear preview</button>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Action</th>
                    <th>Guest</th>
                    <th>Contact</th>
                    <th>Invite</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td><span className={row.action === 'invalid' ? styles.noPill : styles.yesPill}>{row.action}</span></td>
                      <td>
                        <strong>{row.invitation.guestName || '-'}</strong>
                        {row.invitation.plusOneName && <small>Plus one: {row.invitation.plusOneName}</small>}
                      </td>
                      <td>
                        <small>{row.invitation.email || '-'}</small>
                        <small>{row.invitation.phone || '-'}</small>
                        <small>{row.invitation.telegramUsername ? `@${row.invitation.telegramUsername}` : '-'}</small>
                      </td>
                      <td>
                        <small>{row.invitation.inviteType || '-'}</small>
                        <small>{row.invitation.inviteCode || '-'}</small>
                      </td>
                      <td>{row.errors.length ? row.errors.join(' ') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <h2>Guest Invites</h2>
          <div className={styles.bulkActions}>
            <span>{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${sortedInvitations.length} guests`}</span>
            <button type="button" onClick={() => sendEmail(selectedInvitations)} disabled={selectedIds.size === 0 || saving}>Email selected</button>
            <button type="button" onClick={() => startChatQueue('whatsapp')} disabled={selectedIds.size === 0 || saving}>WhatsApp selected</button>
            <button type="button" onClick={() => startChatQueue('telegram')} disabled={selectedIds.size === 0 || saving}>Telegram selected</button>
            <button type="button" onClick={bulkDelete} disabled={selectedIds.size === 0 || saving}>Delete selected</button>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      setSelectedIds(e.target.checked ? new Set(sortedInvitations.map((invite) => invite.id)) : new Set());
                    }}
                    aria-label="Select all invitations"
                  />
                </th>
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
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invite.id)}
                        onChange={(e) => {
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            if (e.target.checked) next.add(invite.id);
                            else next.delete(invite.id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${invite.guestName}`}
                      />
                    </td>
                    <td>
                      {isEditing ? (
                        <div className={styles.editStack}>
                          <input value={draft.guestName} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, guestName: e.target.value } })} placeholder="Guest name" />
                          <input value={draft.plusOneName || ''} onChange={(e) => setDrafts({ ...drafts, [invite.id]: { ...draft, plusOneName: e.target.value } })} placeholder="Plus-one name" />
                        </div>
                      ) : (
                        <>
                          <strong>{invite.guestName}</strong>
                          {invite.plusOneName && <small>Plus one: {invite.plusOneName}</small>}
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

      {chatQueue && (
        <div className={styles.queueOverlay} role="dialog" aria-modal="true" aria-label={`${chatQueue.channel} send queue`}>
          <div className={styles.queueModal}>
            <h2>{chatQueue.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} queue</h2>
            <p>{chatQueue.index + 1} of {chatQueue.invites.length}: {chatQueue.invites[chatQueue.index]?.guestName}</p>
            <div className={styles.queuePreview}>{renderMessage(chatQueue.invites[chatQueue.index], chatQueue.channel)}</div>
            <div className={styles.queueActions}>
              <button type="button" onClick={sendQueuedChat}>Open compose</button>
              <button type="button" onClick={() => setChatQueue(null)}>Close queue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
