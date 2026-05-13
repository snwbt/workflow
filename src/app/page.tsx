import styles from './page.module.css';
import HeroSection from '@/components/sections/HeroSection';
import WelcomeSection from '@/components/sections/WelcomeSection';
import AtAGlanceSection from '@/components/sections/AtAGlanceSection';
import VenueRevealSection from '@/components/sections/VenueRevealSection';
import GalleryInterludeSection from '@/components/sections/GalleryInterludeSection';
import ScheduleSection from '@/components/sections/ScheduleSection';
import TravelSection from '@/components/sections/TravelSection';
import FaqSection from '@/components/sections/FaqSection';
import RsvpSection from '@/components/sections/RsvpSection';
import SignatureMotif from '@/components/SignatureMotif';
import ClosingSection from '@/components/sections/ClosingSection';
import AnchorNav from '@/components/AnchorNav';
import { getDb } from '@/lib/db';

export const metadata = {
  title: 'Russell & Siaw Min - Wedding Celebration',
  description: 'Together with their families, they invite you to a weekend of celebration.',
};

export default function Home() {
  const db = getDb();
  const globalConfig = db.config || {};

  // Build a dictionary of section config keyed by type
  const sections = db.homepage_sections || [];
  const config = sections.reduce((acc: Record<string, any>, section: any) => {
    acc[section.type] = section;
    return acc;
  }, {} as Record<string, any>);

  return (
    <>
      {/* Fixed nav — lives outside the scroll container so it persists across all snapped sections */}
      <AnchorNav globalConfig={globalConfig} />

      <main className={styles.main} id="main-scroll-container">
        {/* Hero — full-screen, no nav padding needed */}
        {(!config.hero || config.hero.enabled) && (
          <div className={styles.section}>
            <HeroSection config={config.hero} />
          </div>
        )}

        {/* At A Glance */}
        {(!config.at_a_glance || config.at_a_glance.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.compactSection}`}>
            <AtAGlanceSection config={config.at_a_glance} globalConfig={globalConfig} />
          </div>
        )}

        <SignatureMotif config={globalConfig} />

        {/* Welcome */}
        {(!config.welcome || config.welcome.enabled) && (
          <div className={`${styles.section} ${styles.withNav}`}>
            <WelcomeSection config={config.welcome} />
          </div>
        )}

        <SignatureMotif config={globalConfig} />

        {/* Schedule */}
        {(!config.schedule || config.schedule.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.naturalSection}`}>
            <ScheduleSection config={config.schedule} />
          </div>
        )}

        <SignatureMotif config={globalConfig} />

        {/* Venue Reveal */}
        {(!config.venue_reveal || config.venue_reveal.enabled) && (
          <div className={styles.section}>
            <VenueRevealSection config={config.venue_reveal} globalConfig={globalConfig} />
          </div>
        )}

        {/* Travel */}
        {(!config.travel || config.travel.enabled) && (
          <div className={`${styles.section} ${styles.withNav}`}>
            <TravelSection config={config.travel} globalConfig={globalConfig} />
          </div>
        )}

        <SignatureMotif config={globalConfig} />

        {/* Gallery Interlude */}
        {(!config.gallery_interlude || config.gallery_interlude.enabled) && (
          <div className={styles.section}>
            <GalleryInterludeSection config={config.gallery_interlude} />
          </div>
        )}

        {/* FAQ */}
        {(!config.faq || config.faq.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.naturalSection}`}>
            <FaqSection config={config.faq} />
          </div>
        )}

        <SignatureMotif config={globalConfig} />

        {/* RSVP */}
        <div className={`${styles.section} ${styles.withNav}`}>
          <RsvpSection globalConfig={globalConfig} />
        </div>

        {/* Closing */}
        {(!config.closing || config.closing.enabled) && (
          <div className={styles.section}>
            <ClosingSection config={config.closing} globalConfig={globalConfig} />
          </div>
        )}
      </main>
    </>
  );
}
