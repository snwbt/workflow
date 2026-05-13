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
import ScrollControls from '@/components/ScrollControls';
import { getDb } from '@/lib/db';
import { connection } from 'next/server';

export const metadata = {
  title: 'Russell & Siaw Min - Wedding Celebration',
  description: 'Together with their families, they invite you to a weekend of celebration.',
};

export default async function Home() {
  await connection();
  const db = await getDb();
  const globalConfig = db.config || {};
  const showMotif = globalConfig.ENABLE_MOTIF !== false && Boolean(globalConfig.SIGNATURE_MOTIF);

  // Build a dictionary of section config keyed by type
  const sections = db.homepage_sections || [];
  const config = sections.reduce((acc: Record<string, any>, section: any) => {
    acc[section.type] = section;
    return acc;
  }, {} as Record<string, any>);
  const scrollSections = [
    (!config.hero || config.hero.enabled) && { id: 'hero', label: 'Hero' },
    (!config.at_a_glance || config.at_a_glance.enabled) && { id: 'at_a_glance', label: 'At a glance' },
    (!config.welcome || config.welcome.enabled) && { id: 'welcome', label: 'Welcome' },
    (!config.schedule || config.schedule.enabled) && { id: 'schedule', label: 'Schedule' },
    (!config.venue_reveal || config.venue_reveal.enabled) && { id: 'venue_reveal', label: 'Venue' },
    (!config.travel || config.travel.enabled) && { id: 'travel', label: 'Travel' },
    (!config.gallery_interlude || config.gallery_interlude.enabled) && { id: 'gallery_interlude', label: 'Gallery' },
    (!config.faq || config.faq.enabled) && { id: 'faq', label: 'FAQ' },
    { id: 'rsvp', label: 'RSVP' },
    (!config.closing || config.closing.enabled) && { id: 'closing', label: 'Closing' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <>
      {/* Fixed nav — lives outside the scroll container so it persists across all snapped sections */}
      <AnchorNav globalConfig={globalConfig} />
      <ScrollControls sections={scrollSections} />

      <main className={styles.main} id="main-scroll-container">
        {/* Hero — full-screen, no nav padding needed */}
        {(!config.hero || config.hero.enabled) && (
          <div className={`${styles.section} ${styles.themeHero}`}>
            <HeroSection config={config.hero} />
          </div>
        )}

        {/* At A Glance */}
        {(!config.at_a_glance || config.at_a_glance.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.compactSection} ${styles.themeNeutral}`}>
            <AtAGlanceSection config={config.at_a_glance} globalConfig={globalConfig} />
          </div>
        )}

        {showMotif && (
          <div className={`${styles.motifDivider} ${styles.themeLight}`}>
            <SignatureMotif config={globalConfig} />
          </div>
        )}

        {/* Welcome */}
        {(!config.welcome || config.welcome.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.themeLight}`}>
            <WelcomeSection config={config.welcome} />
          </div>
        )}

        {showMotif && (
          <div className={`${styles.motifDivider} ${styles.themeNeutral}`}>
            <SignatureMotif config={globalConfig} />
          </div>
        )}

        {/* Schedule */}
        {(!config.schedule || config.schedule.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.naturalSection} ${styles.themeDark}`}>
            <ScheduleSection config={config.schedule} />
          </div>
        )}

        {showMotif && (
          <div className={`${styles.motifDivider} ${styles.themeDark}`}>
            <SignatureMotif config={globalConfig} />
          </div>
        )}

        {/* Venue Reveal */}
        {(!config.venue_reveal || config.venue_reveal.enabled) && (
          <div className={`${styles.section} ${styles.themeDark}`}>
            <VenueRevealSection config={config.venue_reveal} globalConfig={globalConfig} />
          </div>
        )}

        {/* Travel */}
        {(!config.travel || config.travel.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.themeNeutral}`}>
            <TravelSection config={config.travel} globalConfig={globalConfig} />
          </div>
        )}

        {showMotif && (
          <div className={`${styles.motifDivider} ${styles.themeNeutral}`}>
            <SignatureMotif config={globalConfig} />
          </div>
        )}

        {/* Gallery Interlude */}
        {(!config.gallery_interlude || config.gallery_interlude.enabled) && (
          <div className={`${styles.section} ${styles.themeDark}`}>
            <GalleryInterludeSection config={config.gallery_interlude} />
          </div>
        )}

        {/* FAQ */}
        {(!config.faq || config.faq.enabled) && (
          <div className={`${styles.section} ${styles.withNav} ${styles.naturalSection} ${styles.themeLight}`}>
            <FaqSection config={config.faq} />
          </div>
        )}

        {showMotif && (
          <div className={`${styles.motifDivider} ${styles.themeLight}`}>
            <SignatureMotif config={globalConfig} />
          </div>
        )}

        {/* RSVP */}
        <div className={`${styles.section} ${styles.withNav} ${styles.themeRsvp}`}>
          <RsvpSection globalConfig={globalConfig} />
        </div>

        {/* Closing */}
        {(!config.closing || config.closing.enabled) && (
          <div className={`${styles.section} ${styles.themeHero}`}>
            <ClosingSection config={config.closing} globalConfig={globalConfig} />
          </div>
        )}
      </main>
    </>
  );
}
