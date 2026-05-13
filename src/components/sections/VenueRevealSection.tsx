'use client';

import { useReveal } from '@/hooks/useReveal';
import { getGoogleMapsUrl, getWeddingVenues, type WeddingVenue } from '@/lib/venues';
import Image from 'next/image';
import { useState } from 'react';
import { useSiteText } from '@/lib/sitePreferences';
import styles from './VenueRevealSection.module.css';

function VenuePanel({
  venue,
  index,
  isVisible,
  ctaLabel,
  ctaOverride,
  failedImages,
  onImageError,
}: {
  venue: WeddingVenue;
  index: number;
  isVisible: boolean;
  ctaLabel?: string;
  ctaOverride?: string;
  failedImages: string[];
  onImageError: (url: string) => void;
}) {
  const { t } = useSiteText();
  const mapsUrl = getGoogleMapsUrl(venue);
  const directionsUrl = ctaOverride || mapsUrl;
  const hasImage = !!(venue.imageUrl && !failedImages.includes(venue.imageUrl));

  return (
    <article
      className={`${styles.venuePanel} ${venue.key === 'dayTwo' ? styles.rightPanel : styles.leftPanel} ${!hasImage ? styles.fallbackPanel : ''} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {hasImage && (
        <Image
          src={venue.imageUrl || ''}
          alt={venue.imageAlt || venue.name}
          fill
          className={styles.image}
          sizes="(max-width: 959px) 100vw, 50vw"
          onError={() => onImageError(venue.imageUrl || '')}
        />
      )}

      <div className={styles.panelOverlay} />

      <div className={styles.panelContent}>
        <span className={styles.dateLabel}>{t(venue.dateLabel)}</span>
        <h3 className={styles.venueName}>{t(venue.name)}</h3>
        {venue.address && <p className={styles.address}>{t(venue.address)}</p>}
        {venue.arrivalNote && <p className={styles.arrivalNote}>{t(venue.arrivalNote)}</p>}
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={styles.directionsBtn}>
            {t(ctaLabel || 'Get Directions')}
          </a>
        )}
      </div>
    </article>
  );
}

export default function VenueRevealSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.2 });
  const { t } = useSiteText();
  const [failedImages, setFailedImages] = useState<string[]>([]);

  if (!config) return null;

  const venues = getWeddingVenues(globalConfig, config);

  if (venues.length === 0) return null;

  return (
    <section id="venue_reveal" className={styles.container} ref={ref as React.RefObject<HTMLElement>}>
      <div className={`${styles.header} ${isVisible ? styles.visible : ''}`}>
        <span className={styles.eyebrow}>{t('The Venues')}</span>
        <h2 className={styles.heading}>{t(config.heading || 'Where We Gather')}</h2>
        {config.bodyCopy && <p className={styles.bodyCopy}>{t(config.bodyCopy)}</p>}
      </div>

      <div className={`${styles.venuePanels} ${venues.length === 1 ? styles.singleVenue : ''}`}>
        {venues.map((venue, index) => (
          <VenuePanel
            key={venue.key}
            venue={venue}
            index={index}
            isVisible={isVisible}
            ctaLabel={config.ctaLabel}
            ctaOverride={venue.key === 'dayOne' ? config.ctaLink : undefined}
            failedImages={failedImages}
            onImageError={(url) => setFailedImages((current) => [...current, url])}
          />
        ))}
      </div>
    </section>
  );
}
