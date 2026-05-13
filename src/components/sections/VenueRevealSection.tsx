'use client';

import { useReveal } from '@/hooks/useReveal';
import { getGoogleMapsUrl, getWeddingVenues, type WeddingVenue } from '@/lib/venues';
import Image from 'next/image';
import { useState } from 'react';
import styles from './VenueRevealSection.module.css';

function VenueCard({
  venue,
  index,
  isVisible,
  failedImages,
  onImageError,
}: {
  venue: WeddingVenue;
  index: number;
  isVisible: boolean;
  failedImages: string[];
  onImageError: (url: string) => void;
}) {
  const mapsUrl = getGoogleMapsUrl(venue);
  const hasImage = !!(venue.imageUrl && !failedImages.includes(venue.imageUrl));

  return (
    <article
      className={`${styles.venueCard} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      <div className={styles.imageFrame}>
        {hasImage ? (
          <Image
            src={venue.imageUrl || ''}
            alt={venue.imageAlt || venue.name}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 50vw"
            onError={() => onImageError(venue.imageUrl || '')}
          />
        ) : (
          <div className={styles.fallbackCard}>
            <span className={styles.fallbackDate}>{venue.dateLabel}</span>
            <span className={styles.fallbackRule} />
            <h3 className={styles.fallbackName}>{venue.name || 'Venue to be announced'}</h3>
            {venue.address && (
              <address className={styles.fallbackAddress}>
                {venue.address.split(',').map((line, lineIndex) => (
                  <span key={lineIndex}>{line.trim()}</span>
                ))}
              </address>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <span className={styles.dateLabel}>{venue.dateLabel}</span>
        <h3 className={styles.venueName}>{venue.name}</h3>
        {venue.address && <p className={styles.address}>{venue.address}</p>}
        {venue.arrivalNote && <p className={styles.arrivalNote}>{venue.arrivalNote}</p>}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.directionsBtn}>
            Get Directions
          </a>
        )}
      </div>
    </article>
  );
}

export default function VenueRevealSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.2 });
  const [failedImages, setFailedImages] = useState<string[]>([]);

  if (!config) return null;

  const venues = getWeddingVenues(globalConfig, config);

  if (venues.length === 0) return null;

  return (
    <section id="venue_reveal" className={styles.container} ref={ref as React.RefObject<HTMLElement>}>
      <div className={`${styles.header} ${isVisible ? styles.visible : ''}`}>
        <span className={styles.eyebrow}>The Venues</span>
        <h2 className={styles.heading}>{config.heading || 'Where We Gather'}</h2>
        {config.bodyCopy && <p className={styles.bodyCopy}>{config.bodyCopy}</p>}
      </div>

      <div className={`${styles.venueGrid} ${venues.length === 1 ? styles.singleVenue : ''}`}>
        {venues.map((venue, index) => (
          <VenueCard
            key={venue.key}
            venue={venue}
            index={index}
            isVisible={isVisible}
            failedImages={failedImages}
            onImageError={(url) => setFailedImages((current) => [...current, url])}
          />
        ))}
      </div>
    </section>
  );
}
