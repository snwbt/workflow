'use client';

import { useReveal } from '@/hooks/useReveal';
import styles from './TravelSection.module.css';

interface TravelCard {
  mode: string;
  title: string;
  content: string;
}

export default function TravelSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.1 });

  const heading = config?.heading || 'Getting Here';
  const subheading = config?.bodyCopy || '';

  const venueName = globalConfig?.VENUE_NAME || '';
  const venueAddress = globalConfig?.VENUE_ADDRESS || '';
  const venueLat = globalConfig?.VENUE_LAT;
  const venueLng = globalConfig?.VENUE_LNG;
  const mrtStation = globalConfig?.TRAVEL_MRT_STATION || '';
  const mrtDirections = globalConfig?.TRAVEL_MRT_DIRECTIONS || '';
  const busStop = globalConfig?.TRAVEL_BUS_STOP || '';
  const busDirections = globalConfig?.TRAVEL_BUS_DIRECTIONS || '';
  const parking = globalConfig?.TRAVEL_PARKING || '';
  const dropoff = globalConfig?.TRAVEL_DROPOFF || '';
  const hotelDirections = globalConfig?.TRAVEL_HOTEL_DIRECTIONS || '';
  const accessibility = globalConfig?.TRAVEL_ACCESSIBILITY || '';
  const arrivalNote = globalConfig?.VENUE_ARRIVAL_NOTE || '';

  const mapsUrl = venueLat && venueLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${venueLat},${venueLng}`
    : venueAddress
    ? `https://www.google.com/maps/search/${encodeURIComponent(venueAddress)}`
    : null;

  const cards: TravelCard[] = [
    mrtStation ? { mode: 'MRT',     title: mrtStation, content: mrtDirections || mrtStation } : null,
    busStop    ? { mode: 'BUS',     title: busStop,    content: busDirections || busStop }    : null,
    (parking || dropoff) ? { mode: 'DRIVING', title: 'Driving & Parking', content: [parking, dropoff].filter(Boolean).join('\n\n') } : null,
    hotelDirections ? { mode: 'HOTEL',   title: 'From Your Hotel', content: hotelDirections } : null,
    accessibility   ? { mode: 'ACCESS',  title: 'Accessibility',   content: accessibility }  : null,
  ].filter((c): c is TravelCard => c !== null);

  const hasContent = !!(venueName || mrtStation || busStop || parking || hotelDirections);

  return (
    <section id="travel" className={styles.travel} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.content}>
        <div className={`${styles.header} ${isVisible ? styles.visible : ''}`}>
          <h2 className={styles.title}>{heading}</h2>
          {subheading && <p className={styles.subtitle}>{subheading}</p>}
        </div>

        {!hasContent && (
          <p className={styles.empty}>Travel information coming soon.</p>
        )}

        {hasContent && (
          <>
            {/* Venue Address Card */}
            {venueName && (
              <div className={`${styles.venueCard} ${isVisible ? styles.visible : ''}`} style={{ transitionDelay: '0.1s' }}>
                <div className={styles.venueInfo}>
                  <h3 className={styles.venueName}>{venueName}</h3>
                  {venueAddress && <p className={styles.venueAddress}>{venueAddress}</p>}
                  {arrivalNote && <p className={styles.arrivalNote}>{arrivalNote}</p>}
                </div>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.directionsBtn}
                    aria-label={`Get directions to ${venueName}`}
                  >
                    Get Directions
                  </a>
                )}
              </div>
            )}

            {/* Direction Cards Grid */}
            {cards.length > 0 && (
              <div className={styles.cardsGrid}>
                {cards.map((card, i) => (
                  <div
                    key={i}
                    className={`${styles.card} ${isVisible ? styles.visible : ''}`}
                    style={{ transitionDelay: `${0.15 + i * 0.1}s` }}
                  >
                    <span className={styles.cardMode}>{card.mode}</span>
                    <h4 className={styles.cardTitle}>{card.title}</h4>
                    <p className={styles.cardContent}>{card.content}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
