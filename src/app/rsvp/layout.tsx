import Link from 'next/link';
import styles from './layout.module.css';
import { Metadata } from 'next';
import PrivacyFooter from '@/components/PrivacyFooter';
import { getSiteMetadata } from '@/lib/siteMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getSiteMetadata();
  return {
    ...metadata,
    title: `RSVP | ${typeof metadata.title === 'string' ? metadata.title : 'Wedding'}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

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
