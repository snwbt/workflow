'use client';

import styles from '../page.module.css';
import { trackEvent } from '@/lib/analytics';

export default function AdminExport() {
  const handleDownloadClick = () => {
    trackEvent('admin_export_downloaded');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Export Data</h1>
      <p style={{ marginBottom: '2rem' }}>
        Download a complete CSV export of the guest list, including RSVP statuses, 
        meal choices, and dietary restrictions.
      </p>
      
      <a 
        href="/api/admin/export" 
        download="wedding_guests_export.csv"
        onClick={handleDownloadClick}
        style={{
          display: 'inline-block',
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-bg)',
          padding: '1rem 2rem',
          textDecoration: 'none',
          borderRadius: '4px',
          fontFamily: 'var(--font-primary)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontSize: '0.875rem'
        }}
      >
        Download CSV
      </a>
    </div>
  );
}
