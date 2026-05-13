import Link from 'next/link';
import styles from './layout.module.css';
import { Metadata } from 'next';
import PrivacyFooter from '@/components/PrivacyFooter';

export const metadata: Metadata = {
  title: 'RSVP | Our Wedding',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RsvpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← Back to Invitation
        </Link>
      </header>
      <main className={styles.main}>
        {children}
      </main>
      <PrivacyFooter />
    </div>
  );
}
