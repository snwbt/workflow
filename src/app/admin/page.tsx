'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { trackEvent } from '@/lib/analytics';

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
  custom_answers?: Record<string, unknown>;
  submitted_at: string;
}

interface Stats {
  totalResponses: number;
  totalAttending: number;
  totalDeclined: number;
  inviteCounts: Record<string, number>;
  dietaryRestrictionsCount: number;
  accessibilityRequirementsCount: number;
  rsvps: Rsvp[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Rsvp | null>(null);
  const [deletingId, setDeletingId] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchStats = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/stats')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(`Failed to load dashboard data: ${err.message}`);
        setLoading(false);
      });
  };

  useEffect(() => {
    trackEvent('admin_dashboard_viewed');
    void Promise.resolve().then(fetchStats);
  }, []);

  const exportToCSV = () => {
    if (!stats || !stats.rsvps) return;
    
    const headers = [
      'Name', 'Email', 'Invite Type', 'Invite Code', 'Status', 'Guest Count', 'Guest Names',
      'Dinner', 'Mass', 'Dietary', 'Accessibility', 'Message', 'Custom Answers', 'Submitted At'
    ];
    
    const rows = stats.rsvps.map(r => {
      // Format custom answers nicely: "Question: Answer | Question2: Answer2"
      const customAns = r.custom_answers 
        ? Object.entries(r.custom_answers).map(([k, v]) => `${k}: ${v}`).join(' | ') 
        : '';
        
      return [
        `"${r.guest_name || ''}"`,
        `"${r.email || ''}"`,
        `"${r.invite_type || ''}"`,
        `"${r.invite_code || ''}"`,
        `"${r.attendance_status || ''}"`,
        r.guest_count || 1,
        `"${r.additional_guest_names || r.plus_one_name || ''}"`,
        `"${r.dinner_attendance || ''}"`,
        `"${r.mass_attendance || ''}"`,
        `"${r.dietary_restrictions || ''}"`,
        `"${r.accessibility_requirements || ''}"`,
        `"${r.message || ''}"`,
        `"${customAns}"`,
        `"${r.submitted_at || ''}"`
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'rsvps_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackEvent('admin_export_downloaded');
  };

  const handleDelete = async () => {
    if (!deleteConfirm || deletingId) return;

    setDeletingId(deleteConfirm.rsvp_id);
    try {
      const res = await fetch(`/api/admin/guests?rsvp_id=${encodeURIComponent(deleteConfirm.rsvp_id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete RSVP.');
      }

      setDeleteConfirm(null);
      fetchStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting RSVP.');
    } finally {
      setDeletingId('');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    setSavingPassword(true);

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage(data.message || 'Password updated.');
      if (data.reauthRequired) {
        window.setTimeout(() => {
          window.location.assign('/admin');
        }, 800);
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading && !stats) return <div className={styles.container}>Loading...</div>;
  if (error && !stats) return <div className={styles.container} style={{ color: 'var(--color-error)' }}>{error}</div>;
  if (!stats) return <div className={styles.container}>No dashboard data available.</div>;

  return (
    <div className={styles.container}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h1 className={styles.title} style={{marginBottom: 0}}>Overview</h1>
        <button onClick={exportToCSV} className={styles.primaryButton} style={{padding: '0.5rem 1rem'}}>
          Export RSVPs to CSV
        </button>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Responses</div>
          <div className={styles.statValue}>{stats.totalResponses}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Guests Attending</div>
          <div className={styles.statValue}>{stats.totalAttending}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Guests Declined</div>
          <div className={styles.statValue}>{stats.totalDeclined}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-6)', marginBottom: '2rem' }}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Invite Types</div>
          <div style={{ marginTop: 'var(--spacing-4)', fontSize: '0.875rem' }}>
            {Object.entries(stats.inviteCounts).length === 0 ? <p>No invite responses yet.</p> : null}
            {Object.entries(stats.inviteCounts).map(([inviteType, count]) => (
              <div key={inviteType} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                <span>{inviteType === 'friday_saturday' ? 'Friday + Saturday' : inviteType === 'saturday_only' ? 'Saturday only' : 'Unassigned'}:</span> <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Other Details</div>
          <div style={{ marginTop: 'var(--spacing-4)', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
              <span>Dietary Restrictions Noted:</span> <strong>{stats.dietaryRestrictionsCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
              <span>Accessibility Requirements:</span> <strong>{stats.accessibilityRequirementsCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.passwordPanel} aria-labelledby="password-heading">
        <div>
          <h2 id="password-heading" className={styles.sectionTitle}>Change Admin Password</h2>
          <p className={styles.helperText}>
            Username remains admin. After saving, your browser may ask you to sign in again.
          </p>
        </div>
        <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
          <label className={styles.fieldLabel}>
            Current password
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              className={styles.input}
              autoComplete="current-password"
            />
          </label>
          <label className={styles.fieldLabel}>
            New password
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              className={styles.input}
              autoComplete="new-password"
            />
          </label>
          <label className={styles.fieldLabel}>
            Confirm new password
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={styles.input}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className={styles.primaryButton} disabled={savingPassword}>
            {savingPassword ? 'Saving...' : 'Update Password'}
          </button>
          {passwordMessage && <p className={styles.successText}>{passwordMessage}</p>}
          {passwordError && <p className={styles.errorText}>{passwordError}</p>}
        </form>
      </section>

      <h2 className={styles.sectionTitle}>RSVP Submissions</h2>
      <div style={{overflowX: 'auto', background: 'white', borderRadius: '4px', border: '1px solid var(--color-border)'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)'}}>
              <th style={{padding: '0.75rem'}}>Name</th>
              <th style={{padding: '0.75rem'}}>Email</th>
              <th style={{padding: '0.75rem'}}>Invite</th>
              <th style={{padding: '0.75rem'}}>Status</th>
              <th style={{padding: '0.75rem'}}>Guests</th>
              <th style={{padding: '0.75rem'}}>Mass</th>
              <th style={{padding: '0.75rem'}}>Date</th>
              <th style={{padding: '0.75rem'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.rsvps.length === 0 && (
              <tr><td colSpan={8} style={{padding: '1rem', textAlign: 'center'}}>No RSVPs yet.</td></tr>
            )}
            {stats.rsvps.map(rsvp => (
              <tr key={rsvp.rsvp_id} style={{borderBottom: '1px solid var(--color-border)'}}>
                <td style={{padding: '0.75rem', fontWeight: 500}}>{rsvp.guest_name}</td>
                <td style={{padding: '0.75rem'}}>{rsvp.email}</td>
                <td style={{padding: '0.75rem'}}>{rsvp.invite_type === 'friday_saturday' ? 'Fri + Sat' : rsvp.invite_type === 'saturday_only' ? 'Sat only' : '-'}</td>
                <td style={{padding: '0.75rem', color: rsvp.attendance_status === 'attending' ? 'green' : 'red'}}>
                  {rsvp.attendance_status}
                </td>
                <td style={{padding: '0.75rem'}}>{rsvp.guest_count}</td>
                <td style={{padding: '0.75rem'}}>{rsvp.mass_attendance || '-'}</td>
                <td style={{padding: '0.75rem'}}>{new Date(rsvp.submitted_at).toLocaleDateString()}</td>
                <td style={{padding: '0.75rem'}}>
                  <button
                    type="button"
                    className={styles.textDangerButton}
                    onClick={() => setDeleteConfirm(rsvp)}
                    disabled={deletingId === rsvp.rsvp_id}
                  >
                    {deletingId === rsvp.rsvp_id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget && !deletingId) setDeleteConfirm(null); }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h3 id="delete-title" className={styles.modalTitle}>Delete RSVP?</h3>
            <p className={styles.helperText}>
              This will permanently remove the RSVP for {deleteConfirm.guest_name}.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeleteConfirm(null)} disabled={!!deletingId}>
                Cancel
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleDelete} disabled={!!deletingId}>
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
