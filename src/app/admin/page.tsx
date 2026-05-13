'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { trackEvent } from '@/lib/analytics';

interface Stats {
  totalResponses: number;
  totalAttending: number;
  totalDeclined: number;
  mealCounts: Record<string, number>;
  dietaryRestrictionsCount: number;
  rsvps: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    trackEvent('admin_dashboard_viewed');
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div>Loading...</div>;

  const exportToCSV = () => {
    if (!stats || !stats.rsvps) return;
    
    const headers = [
      'Name', 'Email', 'Status', 'Guest Count', 'Plus One Name', 
      'Meal', 'Dietary', 'Transport Needed', 'Message', 'Custom Answers', 'Submitted At'
    ];
    
    const rows = stats.rsvps.map(r => {
      // Format custom answers nicely: "Question: Answer | Question2: Answer2"
      const customAns = r.custom_answers 
        ? Object.entries(r.custom_answers).map(([k, v]) => `${k}: ${v}`).join(' | ') 
        : '';
        
      return [
        `"${r.guest_name || ''}"`,
        `"${r.email || ''}"`,
        `"${r.attendance_status || ''}"`,
        r.guest_count || 1,
        `"${r.plus_one_name || ''}"`,
        `"${r.meal_preference || ''}"`,
        `"${r.dietary_restrictions || ''}"`,
        r.transport_needed ? 'Yes' : 'No',
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
          <div className={styles.statLabel}>Meals</div>
          <div style={{ marginTop: 'var(--spacing-4)', fontSize: '0.875rem' }}>
            {Object.entries(stats.mealCounts).length === 0 ? <p>No meal selections yet.</p> : null}
            {Object.entries(stats.mealCounts).map(([meal, count]) => (
              <div key={meal} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                <span style={{textTransform: 'capitalize'}}>{meal}:</span> <strong>{count}</strong>
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
              <span>Transport Needed:</span> <strong>{stats.rsvps.filter(r => r.transport_needed).length}</strong>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem', color: 'var(--color-espresso)'}}>RSVP Submissions</h2>
      <div style={{overflowX: 'auto', background: 'white', borderRadius: '4px', border: '1px solid var(--color-border)'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)'}}>
              <th style={{padding: '0.75rem'}}>Name</th>
              <th style={{padding: '0.75rem'}}>Email</th>
              <th style={{padding: '0.75rem'}}>Status</th>
              <th style={{padding: '0.75rem'}}>Guests</th>
              <th style={{padding: '0.75rem'}}>Plus One</th>
              <th style={{padding: '0.75rem'}}>Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.rsvps.length === 0 && (
              <tr><td colSpan={6} style={{padding: '1rem', textAlign: 'center'}}>No RSVPs yet.</td></tr>
            )}
            {stats.rsvps.map(rsvp => (
              <tr key={rsvp.rsvp_id} style={{borderBottom: '1px solid var(--color-border)'}}>
                <td style={{padding: '0.75rem', fontWeight: 500}}>{rsvp.guest_name}</td>
                <td style={{padding: '0.75rem'}}>{rsvp.email}</td>
                <td style={{padding: '0.75rem', color: rsvp.attendance_status === 'attending' ? 'green' : 'red'}}>
                  {rsvp.attendance_status}
                </td>
                <td style={{padding: '0.75rem'}}>{rsvp.guest_count}</td>
                <td style={{padding: '0.75rem'}}>{rsvp.plus_one_name || '-'}</td>
                <td style={{padding: '0.75rem'}}>{new Date(rsvp.submitted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
