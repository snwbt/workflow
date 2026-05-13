'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from './page.module.css';

interface Rsvp {
  rsvp_id: string;
  guest_name: string;
  email: string;
  attendance_status: string;
  invite_code?: string;
  invite_type?: string;
  guest_count: number;
  plus_one_name?: string;
  additional_guest_names?: string;
  dinner_attendance?: string;
  mass_attendance?: string;
  dietary_restrictions?: string;
  accessibility_requirements?: string;
  message?: string;
  submitted_at: string;
  updated_at?: string;
  source?: string;
}

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-text-secondary)',
  marginBottom: '0.25rem',
};

const controlStyle = {
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  fontSize: '0.875rem',
  background: 'var(--color-surface)',
};

const inviteTypeLabel = (value?: string) => {
  if (value === 'friday_saturday') return 'Fri + Sat';
  if (value === 'saturday_only') return 'Sat only';
  return 'Unassigned';
};

const answerLabel = (value?: string) => {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return '-';
};

export default function AdminGuests() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRsvp, setEditingRsvp] = useState<Rsvp | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteFilter, setInviteFilter] = useState('all');
  const [dinnerFilter, setDinnerFilter] = useState('all');
  const [massFilter, setMassFilter] = useState('all');
  const [needsFilter, setNeedsFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submitted_desc');

  const fetchRsvps = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/guests')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setRsvps(data);
        else setError('Unexpected data format from server.');
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load RSVP data: ${err.message}`);
        setLoading(false);
      });
  };

  useEffect(() => {
    void Promise.resolve().then(fetchRsvps);
  }, []);

  useEffect(() => {
    if (!editingRsvp || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingRsvp(null);
        editButtonRef.current?.focus();
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingRsvp]);

  const handleSaveEdit = async () => {
    if (!editingRsvp) return;
    try {
      const res = await fetch('/api/admin/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvp_id: editingRsvp.rsvp_id,
          attendance_status: editingRsvp.attendance_status,
          invite_code: editingRsvp.invite_code,
          invite_type: editingRsvp.invite_type,
          guest_count: editingRsvp.guest_count,
          plus_one_name: editingRsvp.plus_one_name,
          additional_guest_names: editingRsvp.additional_guest_names,
          dinner_attendance: editingRsvp.dinner_attendance,
          mass_attendance: editingRsvp.mass_attendance,
          dietary_restrictions: editingRsvp.dietary_restrictions,
          accessibility_requirements: editingRsvp.accessibility_requirements,
          message: editingRsvp.message,
        }),
      });
      if (!res.ok) throw new Error('Failed to save changes');
      setEditingRsvp(null);
      editButtonRef.current?.focus();
      fetchRsvps();
    } catch {
      alert('Error saving changes');
    }
  };

  const handleDelete = async (rsvp_id: string) => {
    if (deletingId) return;

    setDeletingId(rsvp_id);
    try {
      const res = await fetch(`/api/admin/guests?rsvp_id=${encodeURIComponent(rsvp_id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setDeleteConfirm(null);
        fetchRsvps();
      } else {
        alert(data.error || 'Failed to delete RSVP');
      }
    } catch {
      alert('Error deleting RSVP');
    } finally {
      setDeletingId('');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'attending': return styles.statusAttending;
      case 'declined': return styles.statusDeclined;
      default: return styles.statusPending;
    }
  };

  const filteredRsvps = rsvps
    .filter((r) => {
      const haystack = [
        r.guest_name,
        r.email,
        r.invite_code,
        r.additional_guest_names,
        r.dietary_restrictions,
        r.accessibility_requirements,
      ].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.attendance_status === statusFilter;
      const matchesInvite = inviteFilter === 'all' || r.invite_type === inviteFilter;
      const matchesDinner = dinnerFilter === 'all' || r.dinner_attendance === dinnerFilter || (dinnerFilter === 'none' && !r.dinner_attendance);
      const matchesMass = massFilter === 'all' || r.mass_attendance === massFilter || (massFilter === 'none' && !r.mass_attendance);
      const matchesNeeds =
        needsFilter === 'all' ||
        (needsFilter === 'dietary' && Boolean(r.dietary_restrictions?.trim())) ||
        (needsFilter === 'accessibility' && Boolean(r.accessibility_requirements?.trim()));
      return matchesSearch && matchesStatus && matchesInvite && matchesDinner && matchesMass && matchesNeeds;
    })
    .sort((a, b) => {
      if (sortBy === 'submitted_asc') return (a.submitted_at || '').localeCompare(b.submitted_at || '');
      if (sortBy === 'name') return (a.guest_name || '').localeCompare(b.guest_name || '');
      if (sortBy === 'guest_count') return (b.guest_count || 0) - (a.guest_count || 0);
      if (sortBy === 'invite_type') return inviteTypeLabel(a.invite_type).localeCompare(inviteTypeLabel(b.invite_type));
      if (sortBy === 'dinner') return answerLabel(a.dinner_attendance).localeCompare(answerLabel(b.dinner_attendance));
      if (sortBy === 'mass') return answerLabel(a.mass_attendance).localeCompare(answerLabel(b.mass_attendance));
      return (b.submitted_at || '').localeCompare(a.submitted_at || '');
    });

  if (loading) return <div style={{ padding: '2rem' }}>Loading RSVP submissions...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--color-error)' }}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Guest RSVP Submissions</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', alignItems: 'flex-end' }}>
        <div style={{ flexGrow: 1, minWidth: '220px' }}>
          <label htmlFor="guest-search" style={labelStyle}>Search</label>
          <input
            id="guest-search"
            type="text"
            placeholder="Name, email, invite code, needs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...controlStyle, width: '100%' }}
          />
        </div>

        <SelectControl id="status-filter" label="Status" value={statusFilter} onChange={setStatusFilter} options={[
          ['all', 'All statuses'],
          ['attending', 'Attending'],
          ['declined', 'Declined'],
        ]} />
        <SelectControl id="invite-filter" label="Invite" value={inviteFilter} onChange={setInviteFilter} options={[
          ['all', 'All invites'],
          ['friday_saturday', 'Fri + Sat'],
          ['saturday_only', 'Sat only'],
        ]} />
        <SelectControl id="dinner-filter" label="Dinner" value={dinnerFilter} onChange={setDinnerFilter} options={[
          ['all', 'All dinner'],
          ['yes', 'Dinner yes'],
          ['no', 'Dinner no'],
          ['none', 'No response'],
        ]} />
        <SelectControl id="mass-filter" label="Mass" value={massFilter} onChange={setMassFilter} options={[
          ['all', 'All Mass'],
          ['yes', 'Mass yes'],
          ['no', 'Mass no'],
          ['none', 'No response'],
        ]} />
        <SelectControl id="needs-filter" label="Needs" value={needsFilter} onChange={setNeedsFilter} options={[
          ['all', 'All needs'],
          ['dietary', 'Dietary noted'],
          ['accessibility', 'Accessibility noted'],
        ]} />
        <SelectControl id="sort-by" label="Sort By" value={sortBy} onChange={setSortBy} options={[
          ['submitted_desc', 'Newest first'],
          ['submitted_asc', 'Oldest first'],
          ['name', 'Name'],
          ['guest_count', 'Guest count'],
          ['invite_type', 'Invite type'],
          ['dinner', 'Dinner'],
          ['mass', 'Mass'],
        ]} />
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-4)' }}>
        Showing {filteredRsvps.length} of {rsvps.length} submissions
      </p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Invite</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Guests</th>
              <th className={styles.th}>Guest Names</th>
              <th className={styles.th}>Dinner</th>
              <th className={styles.th}>Mass</th>
              <th className={styles.th}>Dietary</th>
              <th className={styles.th}>Accessibility</th>
              <th className={styles.th}>Submitted</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRsvps.map((rsvp) => (
              <tr key={rsvp.rsvp_id} className={styles.tr}>
                <td className={styles.td} style={{ fontWeight: 500 }}>{rsvp.guest_name}</td>
                <td className={styles.td}>{rsvp.email}</td>
                <td className={styles.td}>
                  <span>{inviteTypeLabel(rsvp.invite_type)}</span>
                  {rsvp.invite_code && <small style={{ display: 'block', color: 'var(--color-text-secondary)' }}>{rsvp.invite_code}</small>}
                </td>
                <td className={styles.td}>
                  <span className={`${styles.statusBadge} ${getStatusClass(rsvp.attendance_status)}`}>
                    {rsvp.attendance_status}
                  </span>
                </td>
                <td className={styles.td}>{rsvp.guest_count || (rsvp.attendance_status === 'attending' ? 1 : 0)}</td>
                <td className={styles.td}>{rsvp.additional_guest_names || rsvp.plus_one_name || '-'}</td>
                <td className={styles.td}>{answerLabel(rsvp.dinner_attendance)}</td>
                <td className={styles.td}>{answerLabel(rsvp.mass_attendance)}</td>
                <td className={styles.td}>{rsvp.dietary_restrictions || '-'}</td>
                <td className={styles.td}>{rsvp.accessibility_requirements || '-'}</td>
                <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                  {rsvp.submitted_at ? new Date(rsvp.submitted_at).toLocaleDateString() : '-'}
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      ref={editingRsvp?.rsvp_id === rsvp.rsvp_id ? editButtonRef : undefined}
                      onClick={(e) => {
                        editButtonRef.current = e.currentTarget;
                        setEditingRsvp(rsvp);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
                      aria-label={`Edit ${rsvp.guest_name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(rsvp.rsvp_id)}
                      disabled={deletingId === rsvp.rsvp_id}
                      style={{ background: 'none', border: 'none', color: 'var(--color-error, #c0392b)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
                      aria-label={`Delete ${rsvp.guest_name}`}
                    >
                      {deletingId === rsvp.rsvp_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRsvps.length === 0 && (
              <tr>
                <td colSpan={12} className={styles.td} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                  No RSVP submissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRsvp && (
        <EditModal
          rsvp={editingRsvp}
          modalRef={modalRef}
          setRsvp={setEditingRsvp}
          onCancel={() => {
            setEditingRsvp(null);
            editButtonRef.current?.focus();
          }}
          onSave={handleSaveEdit}
        />
      )}

      {deleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !deletingId) setDeleteConfirm(null); }}
        >
          <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-8)', borderRadius: '8px', maxWidth: '400px', textAlign: 'center' }}>
            <p style={{ marginBottom: 'var(--spacing-6)' }}>Are you sure you want to delete this RSVP? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-4)', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={!!deletingId} style={{ padding: '0.5rem 1.25rem', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={!!deletingId} style={{ padding: '0.5rem 1.25rem', background: '#c0392b', color: 'white', border: 'none', cursor: 'pointer' }}>
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectControl({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={controlStyle}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

function EditModal({
  rsvp,
  modalRef,
  setRsvp,
  onCancel,
  onSave,
}: {
  rsvp: Rsvp;
  modalRef: RefObject<HTMLDivElement | null>;
  setRsvp: (value: Rsvp) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        style={{ background: 'var(--color-surface)', padding: 'var(--spacing-8)', borderRadius: '8px', minWidth: '360px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 id="edit-modal-title" style={{ marginBottom: 'var(--spacing-6)', fontSize: '1.25rem', fontFamily: 'var(--font-serif)' }}>
          Edit - {rsvp.guest_name}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <ModalSelect label="RSVP Status" value={rsvp.attendance_status} onChange={(value) => setRsvp({ ...rsvp, attendance_status: value })} options={[
            ['attending', 'Attending'],
            ['declined', 'Declined'],
          ]} />
          <ModalSelect label="Invite Type" value={rsvp.invite_type || ''} onChange={(value) => setRsvp({ ...rsvp, invite_type: value })} options={[
            ['', 'Unassigned'],
            ['friday_saturday', 'Friday + Saturday'],
            ['saturday_only', 'Saturday only'],
          ]} />
          <ModalInput label="Invite Code" value={rsvp.invite_code || ''} onChange={(value) => setRsvp({ ...rsvp, invite_code: value })} />
          <ModalInput label="Guest Count" type="number" value={String(rsvp.guest_count || 1)} onChange={(value) => setRsvp({ ...rsvp, guest_count: Number(value) })} />
          <ModalTextarea label="Guest / Plus-One Names" value={rsvp.additional_guest_names || rsvp.plus_one_name || ''} onChange={(value) => setRsvp({ ...rsvp, additional_guest_names: value, plus_one_name: value.split(/\r?\n|,/)[0]?.trim() || '' })} />
          <ModalSelect label="Dinner Attendance" value={rsvp.dinner_attendance || ''} onChange={(value) => setRsvp({ ...rsvp, dinner_attendance: value })} options={[
            ['', 'No response'],
            ['yes', 'Yes'],
            ['no', 'No'],
          ]} />
          <ModalSelect label="Mass Attendance" value={rsvp.mass_attendance || ''} onChange={(value) => setRsvp({ ...rsvp, mass_attendance: value })} options={[
            ['', 'No response'],
            ['yes', 'Yes'],
            ['no', 'No'],
          ]} />
          <ModalTextarea label="Dietary Restrictions" value={rsvp.dietary_restrictions || ''} onChange={(value) => setRsvp({ ...rsvp, dietary_restrictions: value })} />
          <ModalTextarea label="Accessibility Requirements" value={rsvp.accessibility_requirements || ''} onChange={(value) => setRsvp({ ...rsvp, accessibility_requirements: value })} />
          <ModalTextarea label="Note to Couple" value={rsvp.message || ''} onChange={(value) => setRsvp({ ...rsvp, message: value })} />

          <div style={{ display: 'flex', gap: 'var(--spacing-4)', justifyContent: 'flex-end', marginTop: 'var(--spacing-2)' }}>
            <button onClick={onCancel} style={{ padding: '0.5rem 1.25rem', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={onSave} style={{ padding: '0.5rem 1.25rem', background: 'var(--color-text-primary)', color: 'var(--color-surface)', border: 'none', cursor: 'pointer' }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }} />
    </div>
  );
}

function ModalTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', resize: 'vertical' }} />
    </div>
  );
}

function ModalSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}
