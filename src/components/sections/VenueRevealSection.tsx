'use client';

import { useReveal } from '@/hooks/useReveal';
import Image from 'next/image';
import { useState } from 'react';
import styles from './VenueRevealSection.module.css';

export default function VenueRevealSection({ config, globalConfig }: { config?: any, globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.3 });
  const [failedImageUrl, setFailedImageUrl] = useState('');

  const mediaUrl = config?.mediaUrl?.trim();
  const displayMode = config?.displayMode || 'image';
  const hasImage = !!(mediaUrl && displayMode !== 'fallback' && failedImageUrl !== mediaUrl);

  if (!config) return null;

  const mapsUrl = config?.ctaLink || (globalConfig?.VENUE_LAT && globalConfig?.VENUE_LNG
    ? `https://www.google.com/maps/dir/?api=1&destination=${globalConfig.VENUE_LAT},${globalConfig.VENUE_LNG}`
    : globalConfig?.VENUE_ADDRESS
    ? `https://www.google.com/maps/search/${encodeURIComponent(globalConfig.VENUE_ADDRESS)}`
    : null);

  const address = globalConfig?.VENUE_ADDRESS || '';
  const motif = globalConfig?.SIGNATURE_MOTIF || 'R & S';
  const enableMotif = globalConfig?.ENABLE_MOTIF !== false;

  return (
    <section id="venue_reveal" className={styles.container} ref={ref as React.RefObject<HTMLElement>}>
      {/* Left — image or elegant fallback card */}
      <div className={styles.imageContainer}>
        {hasImage ? (
          <Image
            src={mediaUrl || ''}
            alt={config.imageAlt || config.heading || 'Venue'}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 50vw"
            onError={() => setFailedImageUrl(mediaUrl || '')}
          />
        ) : (
          <div className={styles.fallbackCard}>
            <div className={styles.fallbackInner}>
              {enableMotif && (
                <span className={styles.fallbackMotif} aria-hidden="true">{motif}</span>
              )}
              <div className={styles.fallbackRule} />
              <h3 className={styles.fallbackName}>{config.heading || 'The Venue'}</h3>
              <div className={styles.fallbackRule} />
              {address && (
                <address className={styles.fallbackAddress}>
                  {address.split(',').map((line: string, i: number) => (
                    <span key={i} className={styles.fallbackAddressLine}>{line.trim()}</span>
                  ))}
                </address>
              )}
              <div className={styles.fallbackPin} aria-hidden="true">
                <svg width="16" height="22" viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 0C3.6 0 0 3.6 0 8C0 13.4 8 22 8 22C8 22 16 13.4 16 8C16 3.6 12.4 0 8 0ZM8 10.8C6.5 10.8 5.2 9.5 5.2 8C5.2 6.5 6.5 5.2 8 5.2C9.5 5.2 10.8 6.5 10.8 8C10.8 9.5 9.5 10.8 8 10.8Z" fill="currentColor"/>
                </svg>
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fallbackDirections}
                  aria-label={`Get directions to ${config.heading}`}
                >
                  {config.ctaLabel || 'Get Directions'}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right — text content */}
      <div className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
        <h2 className={styles.heading}>{config.heading}</h2>
        <div className={styles.divider} />
        {config.bodyCopy && <p className={styles.bodyCopy}>{config.bodyCopy}</p>}
        {hasImage && mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.directionsBtn}
          >
            {config.ctaLabel || 'Get Directions'}
          </a>
        )}
      </div>
    </section>
  );
}
