'use client';

import { useState } from 'react';
import styles from '../page.module.css';

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ imported?: number; skipped?: number; errors?: string[]; message?: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setResult({ imported: data.imported, skipped: data.skipped, errors: data.errors });
        setFile(null);
      } else {
        setResult({ message: data.error || 'Import failed.' });
      }
    } catch {
      setResult({ message: 'A network error occurred.' });
    }
    setUploading(false);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Import Guests</h1>
      <div className={styles.content}>
        <p>Upload a CSV file to import guests.</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-4)' }}>
          Expected format: Party ID, First Name, Last Name, Max Party Size, Plus One Allowed, Invited Events (semicolon separated)
        </p>

        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 'var(--spacing-4)', display: 'block' }}
        />

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ padding: '0.5rem 1rem', background: 'var(--color-text-primary)', color: 'var(--color-surface)', border: 'none', cursor: 'pointer' }}
        >
          {uploading ? 'Importing…' : 'Import CSV'}
        </button>

        {result && (
          <div style={{ marginTop: 'var(--spacing-6)', padding: 'var(--spacing-4)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            {result.message ? (
              <p style={{ color: 'var(--color-error)' }}>{result.message}</p>
            ) : (
              <>
                <p style={{ marginBottom: 'var(--spacing-2)' }}>
                  ✓ <strong>{result.imported}</strong> guests imported
                  {(result.skipped ?? 0) > 0 && <>, <strong>{result.skipped}</strong> already existed (skipped)</>}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div>
                    <p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-2)', fontWeight: 600 }}>
                      {result.errors.length} row{result.errors.length > 1 ? 's' : ''} had errors:
                    </p>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-error)' }}>
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
