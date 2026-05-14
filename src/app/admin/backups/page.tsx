'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type BackupScope = 'rsvps' | 'guests' | 'invitations' | 'seating';
type BackupInterval = 'daily';

interface BackupSettings {
  enabled: boolean;
  interval: BackupInterval;
  scopes: BackupScope[];
  retentionCount: number;
  lastRunAt?: string;
}

interface BackupListItem {
  id: string;
  filename: string;
  createdAt: string;
  scopes: BackupScope[];
  size: number;
  storage: 'blob' | 'local';
}

interface BackupPreview {
  createdAt: string;
  scopes: BackupScope[];
  counts: Record<string, number | undefined>;
}

interface DatabaseRuntimeInfo {
  mode: 'database' | 'seed-readonly' | 'local-json';
  hasDatabaseUrl: boolean;
  writable: boolean;
  localDbInitialized: boolean;
}

const scopeOptions: { value: BackupScope; label: string }[] = [
  { value: 'rsvps', label: 'RSVP Guests' },
  { value: 'guests', label: 'Guest roster' },
  { value: 'invitations', label: 'Invites' },
  { value: 'seating', label: 'Seating plan' },
];

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSize(size: number) {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

export default function AdminBackupsPage() {
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    interval: 'daily',
    scopes: ['rsvps', 'guests', 'invitations', 'seating'],
    retentionCount: 30,
  });
  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [encryption, setEncryption] = useState({ dataConfigured: false, backupConfigured: false });
  const [database, setDatabase] = useState<DatabaseRuntimeInfo | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<BackupScope[]>(['rsvps', 'guests', 'invitations', 'seating']);
  const [importBackup, setImportBackup] = useState<any>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [restoreScopes, setRestoreScopes] = useState<BackupScope[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedScopeSet = useMemo(() => new Set(selectedScopes), [selectedScopes]);
  const restoreScopeSet = useMemo(() => new Set(restoreScopes), [restoreScopes]);

  const load = () => {
    setError('');
    fetch('/api/admin/backups')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to load backups.');
        setSettings(data.settings);
        setSelectedScopes(data.settings.scopes);
        setBackups(data.backups || []);
        setEncryption(data.encryption || {});
        setDatabase(data.database || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load backups.'));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleScope = (scope: BackupScope, checked: boolean, target: 'manual' | 'restore' | 'settings') => {
    const apply = (current: BackupScope[]) => {
      const next = new Set(current);
      if (checked) next.add(scope);
      else next.delete(scope);
      return Array.from(next) as BackupScope[];
    };

    if (target === 'manual') setSelectedScopes(apply);
    if (target === 'restore') setRestoreScopes(apply);
    if (target === 'settings') setSettings((current) => ({ ...current, scopes: apply(current.scopes) }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setSettings(data.settings);
      setMessage('Backup settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes: selectedScopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create backup.');
      downloadJson(data.backup.filename, data.envelope);
      setMessage('Encrypted backup created and downloaded.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup.');
    } finally {
      setSaving(false);
    }
  };

  const previewImport = async (backup: any) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview backup.');
      setImportBackup(backup);
      setPreview(data.preview);
      setRestoreScopes(data.preview.scopes);
      setMessage('Backup decrypted for preview.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview backup.');
      setPreview(null);
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    try {
      await previewImport(JSON.parse(await file.text()));
    } catch {
      setError('Backup file is not valid JSON.');
    }
  };

  const restore = async () => {
    if (!importBackup || restoreScopes.length === 0) return;
    if (!window.confirm(`Restore ${restoreScopes.length} backup scope${restoreScopes.length === 1 ? '' : 's'}? This will overwrite current data for those scopes.`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: importBackup, scopes: restoreScopes, restore: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore backup.');
      setMessage(`Restored ${data.restoredScopes.join(', ')}.`);
      setPreview(null);
      setImportBackup(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup.');
    } finally {
      setSaving(false);
    }
  };

  const encryptStoredData = async () => {
    if (!window.confirm('Encrypt stored guest, invite, RSVP, and seating data now? Keep your DATA_ENCRYPTION_KEY safe before continuing.')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups/encrypt', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to encrypt stored data.');
      setMessage('Stored sensitive data has been rewritten as encrypted payloads.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to encrypt stored data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Backups & Security</h1>
          <p>Create encrypted backups, restore admin data, and migrate stored guest data to encrypted payloads.</p>
        </div>
        <span className={styles.status}>{saving ? 'Working...' : 'Ready'}</span>
      </header>

      {(message || error) && (
        <div className={`${styles.notice} ${error ? styles.noticeError : ''}`}>
          {error || message}
        </div>
      )}

      {database?.mode === 'seed-readonly' && (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          Production database is not configured. Public pages can read the clean seed data, but admin changes will not persist until DATABASE_URL is set.
        </div>
      )}

      {database?.mode === 'local-json' && (
        <div className={styles.notice}>
          Local development is using the ignored runtime database at data/local-db.json. The tracked seed stays clean for commits.
        </div>
      )}

      <section className={styles.grid}>
        <div className={styles.panel}>
          <h2>Encryption</h2>
          <p className={styles.statusText}>Data key: {encryption.dataConfigured ? 'Configured' : 'Not configured'}</p>
          <p className={styles.statusText}>Backup key: {encryption.backupConfigured ? 'Configured' : 'Not configured'}</p>
          <p className={styles.helper}>Set DATA_ENCRYPTION_KEY and BACKUP_ENCRYPTION_KEY in the environment before enabling encrypted storage or creating backups.</p>
          <button type="button" className={styles.dangerButton} onClick={encryptStoredData} disabled={!encryption.dataConfigured || saving}>
            Encrypt stored data
          </button>
        </div>

        <div className={styles.panel}>
          <h2>Manual backup</h2>
          <div className={styles.scopeGrid}>
            {scopeOptions.map((scope) => (
              <label key={scope.value} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={selectedScopeSet.has(scope.value)}
                  onChange={(event) => toggleScope(scope.value, event.target.checked, 'manual')}
                />
                {scope.label}
              </label>
            ))}
          </div>
          <button type="button" className={styles.button} onClick={createBackup} disabled={selectedScopes.length === 0 || !encryption.backupConfigured || saving}>
            Create encrypted backup
          </button>
        </div>

        <div className={styles.panel}>
          <h2>Auto-backups</h2>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
            />
            Enable scheduled backups
          </label>
          <p className={styles.helper}>Scheduled backups run daily at 2:00 AM Singapore time.</p>
          <label className={styles.fieldLabel}>
            Retention count
            <input className={styles.input} type="number" min={1} max={200} value={settings.retentionCount} onChange={(event) => setSettings({ ...settings, retentionCount: Number(event.target.value) })} />
          </label>
          <div className={styles.scopeGrid}>
            {scopeOptions.map((scope) => (
              <label key={scope.value} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={settings.scopes.includes(scope.value)}
                  onChange={(event) => toggleScope(scope.value, event.target.checked, 'settings')}
                />
                {scope.label}
              </label>
            ))}
          </div>
          <p className={styles.helper}>Last run: {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : 'Never'}</p>
          <button type="button" className={styles.button} onClick={saveSettings} disabled={saving}>Save schedule</button>
        </div>

        <div className={styles.panel}>
          <h2>Restore backup</h2>
          <input className={styles.input} type="file" accept=".json,application/json" onChange={(event) => handleImportFile(event.target.files?.[0])} />
          {preview && (
            <div className={styles.preview}>
              <strong>Backup from {new Date(preview.createdAt).toLocaleString()}</strong>
              <p className={styles.helper}>
                RSVP Guests: {preview.counts.rsvps ?? '-'} | Guest roster: {preview.counts.guests ?? '-'} | Invites: {preview.counts.invitations ?? '-'} | Seating assignments: {preview.counts.seatingAssignments ?? '-'}
              </p>
              <div className={styles.scopeGrid}>
                {preview.scopes.map((scope) => (
                  <label key={scope} className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={restoreScopeSet.has(scope)}
                      onChange={(event) => toggleScope(scope, event.target.checked, 'restore')}
                    />
                    {scopeOptions.find((option) => option.value === scope)?.label || scope}
                  </label>
                ))}
              </div>
              <button type="button" className={styles.dangerButton} onClick={restore} disabled={restoreScopes.length === 0 || saving}>Restore selected scopes</button>
            </div>
          )}
        </div>
      </section>

      <section className={styles.panel} style={{ marginTop: 'var(--spacing-6)' }}>
        <h2>Stored backups</h2>
        {backups.length === 0 ? (
          <p className={styles.helper}>No stored backups yet.</p>
        ) : (
          <ul className={styles.list}>
            {backups.map((backup) => (
              <li key={backup.id}>
                <div>
                  <strong>{backup.filename}</strong>
                  <small>{new Date(backup.createdAt).toLocaleString()} | {formatSize(backup.size)} | {backup.storage}</small>
                  {backup.scopes.length > 0 && <small>{backup.scopes.join(', ')}</small>}
                </div>
                <a className={styles.secondaryButton} href={`/api/admin/backups/download?id=${encodeURIComponent(backup.id)}`}>
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
