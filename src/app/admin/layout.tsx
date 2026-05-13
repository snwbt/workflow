import Link from 'next/link';
import styles from './layout.module.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`admin-theme ${styles.container}`}>
      <header className={styles.header}>
        <div className={styles.brand}>Admin Dashboard</div>
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>Overview</Link>
          <Link href="/admin/guests" className={styles.navLink}>Guests</Link>
          <Link href="/admin/seating" className={styles.navLink}>Seating</Link>
          <Link href="/admin/editor" className={styles.navLink}>Editor</Link>
          <Link href="/admin/import" className={styles.navLink}>Import</Link>
          <Link href="/admin/export" className={styles.navLink}>Export</Link>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
