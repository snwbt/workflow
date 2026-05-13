'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './page.module.css';

interface Rsvp {
  rsvp_id: string;
  guest_name: string;
  email: string;
  attendance_status: string;
  guest_count: number;
  plus_one_name?: string;
  meal_preference?: string;
  dietary_restrictions?: string;
  transport_needed?: boolean;
  message?: string;
  submitted_at: string;
  updated_at?: string;
  source?: string;
}

export default function AdminGuests() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRsvp, setEditingRsvp] = useState<Rsvp | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mealFilter, setMealFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submitted_desc');

  const fetchRsvps = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/guests')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRsvps(data);
        } else {
          setError('Unexpected data format from server.');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(`Failed to load RSVP data: ${err.message}`);
        setLoading(false);
      });
  };

  useEffect(() => {
    void Promise.resolve().then(fetchRsvps);
  }, []);

  // Focus trap inside modal
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
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
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
          meal_preference: editingRsvp.meal_preference,
          dietary_restrictions: editingRsvp.dietary_restrictions,
          guest_count: editingRsvp.guest_count,
          plus_one_name: editingRsvp.plus_one_name,
          transport_needed: editingRsvp.transport_needed,
          message: editingRsvp.message,
        })
      });
      if (res.ok) {
        setEditingRsvp(null);
        editButtonRef.current?.focus();
        fetchRsvps();
      } else {
        alert('Failed to save changes');
      }
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
    .filter(r => {
      const matchesSearch = `${r.guest_name} ${r.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.attendance_status === statusFilter;
      const matchesMeal = mealFilter === 'all' || r.meal_preference === mealFilter || (mealFilter === 'none' && !r.meal_preference);
      return matchesSearch && matchesStatus && matchesMeal;
    })
    .sort((a, b) => {
      if (sortBy === 'submitted_asc') return a.submitted_at.localeCompare(b.submitted_at);
      if (sortBy === 'name') return a.guest_name.localeCompare(b.guest_name);
      return b.submitted_at.localeCompare(a.submitted_at); // default: newest first
    });

  const labelStyle = { display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' };
  const controlStyle = { padding: '0.4rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '0.875rem', background: 'var(--color-surface)' };

  if (loading) return <div style={{ padding: '2rem' }}>Loading RSVP submissions...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--color-error)' }}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Guest RSVP Submissions</h1>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', alignItems: 'flex-end' }}>
        <div style={{ flexGrow: 1, minWidth: '180px' }}>
          <label htmlFor="guest-search" style={labelStyle}>Search</label>
          <input
            id="guest-search"
            type="text"
            placeholder="Name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...controlStyle, width: '100%' }}
          />
        </div>

        <div>
          <label htmlFor="status-filter" style={labelStyle}>Status</label>
          <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={controlStyle}>
            <option value="all">All Statuses</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        <div>
          <label htmlFor="meal-filter" style={labelStyle}>Meal</label>
          <select id="meal-filter" value={mealFilter} onChange={(e) => setMealFilter(e.target.value)} style={controlStyle}>
            <option value="all">All Meals</option>
            <option value="beef">Beef</option>
            <option value="fish">Fish</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="none">None / Pending</option>
          </select>
        </div>

        <div>
          <label htmlFor="sort-by" style={labelStyle}>Sort By</label>
          <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={controlStyle}>
            <option value="submitted_desc">Newest First</option>
            <option value="submitted_asc">Oldest First</option>
            <option value="name">Name</option>
          </select>
        </div>
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
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Guests</th>
              <th className={styles.th}>Plus One</th>
              <th className={styles.th}>Meal</th>
              <th className={styles.th}>Dietary</th>
              <th className={styles.th}>Transport</th>
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
                  <span className={`${styles.statusBadge} ${getStatusClass(rsvp.attendance_status)}`}>
                    {rsvp.attendance_status}
                  </span>
                </td>
                <td className={styles.td}>{rsvp.guest_count || 1}</td>
                <td className={styles.td}>{rsvp.plus_one_name || '—'}</td>
                <td className={styles.td}>{rsvp.meal_preference || '—'}</td>
                <td className={styles.td}>{rsvp.dietary_restrictions || '—'}</td>
                <td className={styles.td}>{rsvp.transport_needed ? 'Yes' : '—'}</td>
                <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                  {rsvp.submitted_at ? new Date(rsvp.submitted_at).toLocaleDateString() : '—'}
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
                <td colSpan={10} className={styles.td} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                  No RSVP submissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingRsvp && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingRsvp(null); editButtonRef.current?.focus(); } }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
            style={{ background: 'var(--color-surface)', padding: 'var(--spacing-8)', borderRadius: '8px', minWidth: '360px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 id="edit-modal-title" style={{ marginBottom: 'var(--spacing-6)', fontSize: '1.25rem', fontFamily: 'var(--font-serif)' }}>
              Edit — {editingRsvp.guest_name}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div>
                <label htmlFor="modal-status" style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  RSVP Status
                </label>
                <select
                  id="modal-status"
                  value={editingRsvp.attendance_status}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, attendance_status: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }}
                >
                  <option value="attending">Attending</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-count" style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Guest Count
                </label>
                <input
                  id="modal-count"
                  type="number"
                  min={1}
                  value={editingRsvp.guest_count || 1}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, guest_count: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label htmlFor="modal-plusone" style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Plus One Name
                </label>
                <input
                  id="modal-plusone"
                  type="text"
                  value={editingRsvp.plus_one_name || ''}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, plus_one_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label htmlFor="modal-meal" style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Meal Preference
                </label>
                <select
                  id="modal-meal"
                  value={editingRsvp.meal_preference || ''}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, meal_preference: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }}
                >
                  <option value="">None</option>
                  <option value="beef">Beef</option>
                  <option value="fish">Fish</option>
                  <option value="vegetarian">Vegetarian</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-dietary" style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dietary Restrictions
                </label>
                <input
                  id="modal-dietary"
                  type="text"
                  value={editingRsvp.dietary_restrictions || ''}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, dietary_restrictions: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="modal-transport"
                  type="checkbox"
                  checked={!!editingRsvp.transport_needed}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, transport_needed: e.target.checked })}
                />
                <label htmlFor="modal-transport" style={{ fontSize: '0.875rem' }}>Transport Needed</label>
              </div>

              <div>
                <label htmlFor="modal-message" style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Note to Couple
                </label>
                <textarea
                  id="modal-message"
                  value={editingRsvp.message || ''}
                  onChange={(e) => setEditingRsvp({ ...editingRsvp, message: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-4)', justifyContent: 'flex-end', marginTop: 'var(--spacing-2)' }}>
                <button
                  onClick={() => { setEditingRsvp(null); editButtonRef.current?.focus(); }}
                  style={{ padding: '0.5rem 1.25rem', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{ padding: '0.5rem 1.25rem', background: 'var(--color-text-primary)', color: 'var(--color-surface)', border: 'none', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
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
