'use client';

import { useReveal } from '@/hooks/useReveal';
import { getGoogleMapsUrl, getWeddingVenues, type WeddingVenue } from '@/lib/venues';
import { useSiteText } from '@/lib/sitePreferences';
import styles from './TravelSection.module.css';

interface TravelCard {
  mode: string;
  title: string;
  content: string;
}

function TravelIcon({ mode }: { mode: string }) {
  const iconProps = {
    viewBox: '0 0 32 32',
    className: styles.travelIcon,
    'aria-hidden': true,
  };

  switch (mode) {
    case 'MRT':
      return (
        <svg {...iconProps}>
          <path d="M9 5h14c2.2 0 4 1.8 4 4v9c0 2.2-1.8 4-4 4H9c-2.2 0-4-1.8-4-4V9c0-2.2 1.8-4 4-4Z" />
          <path d="M9 12h14M10 22l-3 5M22 22l3 5M11 17h.1M21 17h.1" />
        </svg>
      );
    case 'BUS':
      return (
        <svg {...iconProps}>
          <path d="M8 6h16c2 0 3 1 3 3v11c0 1.7-1.3 3-3 3H8c-1.7 0-3-1.3-3-3V9c0-2 1-3 3-3Z" />
          <path d="M8 13h16M10 23v3M22 23v3M10 18h.1M22 18h.1" />
        </svg>
      );
    case 'DRIVING':
      return (
        <svg {...iconProps}>
          <path d="M7 16l2.2-6.2A3 3 0 0 1 12 8h8a3 3 0 0 1 2.8 1.8L25 16" />
          <path d="M6 16h20v7H6zM9 23v3M23 23v3M10 19h.1M22 19h.1" />
        </svg>
      );
    case 'HOTEL':
      return (
        <svg {...iconProps}>
          <path d="M7 25V8h10v17M17 14h8v11M10 12h2M10 17h2M10 22h2M20 18h2M20 22h2" />
        </svg>
      );
    case 'ACCESS':
      return (
        <svg {...iconProps}>
          <path d="M16 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 9v7h6M16 16l-4 9M19 18l4 7M9 16a7 7 0 1 0 6 10" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M5 16h20M19 10l6 6-6 6" />
        </svg>
      );
  }
}

function getTravelCards(venue: WeddingVenue): TravelCard[] {
  return [
    venue.mrtStation ? { mode: 'MRT', title: venue.mrtStation, content: venue.mrtDirections || venue.mrtStation } : null,
    venue.busStop ? { mode: 'BUS', title: venue.busStop, content: venue.busDirections || venue.busStop } : null,
    (venue.parking || venue.dropoff)
      ? { mode: 'DRIVING', title: 'Driving & Parking', content: [venue.parking, venue.dropoff].filter(Boolean).join('\n\n') }
      : null,
    venue.hotelDirections ? { mode: 'HOTEL', title: 'From Your Hotel', content: venue.hotelDirections } : null,
    venue.accessibility ? { mode: 'ACCESS', title: 'Accessibility', content: venue.accessibility } : null,
  ].filter((card): card is TravelCard => card !== null);
}

function VenueMap({ venue, mapsEnabled }: { venue: WeddingVenue; mapsEnabled: boolean }) {
  const { t } = useSiteText();
  const mapsUrl = getGoogleMapsUrl(venue);

  if (!mapsEnabled) {
    return (
      <div className={styles.mapFallback}>
        <span className={styles.mapKicker}>{t('Map Preview')}</span>
        <strong>{t(venue.name)}</strong>
        <span>{t(venue.address || 'Location details will be shared soon.')}</span>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.directionsBtn}>
            {t('Open in Google Maps')}
          </a>
        )}
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const query = venue.lat !== undefined && venue.lng !== undefined
    ? `${venue.lat},${venue.lng}`
    : venue.address || venue.name;
  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}`;

  return (
    <div className={styles.mapFrame}>
      <iframe
        title={`${venue.name} map`}
        src={mapSrc}
        className={styles.mapEmbed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

function DestinationPanel({
  venue,
  index,
  isVisible,
  mapsEnabled,
}: {
  venue: WeddingVenue;
  index: number;
  isVisible: boolean;
  mapsEnabled: boolean;
}) {
  const { t } = useSiteText();
  const cards = getTravelCards(venue);
  const mapsUrl = getGoogleMapsUrl(venue);

  return (
    <article
      className={`${styles.destination} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className={styles.destinationHeader}>
        <span className={styles.dateLabel}>{t(venue.dateLabel)}</span>
        <h3 className={styles.venueName}>{t(venue.name)}</h3>
        {venue.address && <p className={styles.venueAddress}>{t(venue.address)}</p>}
        {venue.arrivalNote && <p className={styles.arrivalNote}>{t(venue.arrivalNote)}</p>}
      </div>

      <VenueMap venue={venue} mapsEnabled={mapsEnabled} />

      {cards.length > 0 && (
        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div key={`${venue.key}-${card.mode}`} className={styles.card}>
              <span className={styles.iconMark}>
                <TravelIcon mode={card.mode} />
              </span>
              <div className={styles.cardBody}>
                <span className={styles.cardMode}>{t(card.mode)}</span>
                <h4 className={styles.cardTitle}>{t(card.title)}</h4>
                <p className={styles.cardContent}>{t(card.content)}</p>
              </div>
            </div>
          ))}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={`${styles.card} ${styles.actionCard}`}>
              <span className={styles.iconMark}>
                <TravelIcon mode="DIRECTIONS" />
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardMode}>{t('Directions')}</span>
                <span className={styles.cardTitle}>{t('Open route')}</span>
              </span>
            </a>
          )}
          {venue.key === 'dayOne' && (
            <a href="/seating" className={`${styles.card} ${styles.actionCard}`}>
              <span className={styles.iconMark}>
                <TravelIcon mode="HOTEL" />
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardMode}>{t('Reception')}</span>
                <span className={styles.cardTitle}>{t('Find your seat')}</span>
              </span>
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function TravelSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.1 });
  const { t } = useSiteText();

  const heading = config?.heading || 'Getting Here';
  const subheading = config?.bodyCopy || '';
  const venues = getWeddingVenues(globalConfig);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasMappableVenue = venues.some((venue) => venue.lat !== undefined || venue.lng !== undefined || Boolean(venue.address || venue.name));
  const mapsEnabled = Boolean(apiKey) && hasMappableVenue;
  const destinationPanels = (
    <div className={`${styles.destinationsGrid} ${venues.length === 1 ? styles.singleDestination : ''}`}>
      {venues.map((venue, index) => (
        <DestinationPanel
          key={venue.key}
          venue={venue}
          index={index}
          isVisible={isVisible}
          mapsEnabled={mapsEnabled}
        />
      ))}
    </div>
  );

  return (
    <section id="travel" className={styles.travel} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.content}>
        <div className={`${styles.header} ${isVisible ? styles.visible : ''}`}>
          <h2 className={styles.title}>{t(heading)}</h2>
          {subheading && <p className={styles.subtitle}>{t(subheading)}</p>}
        </div>

        {venues.length === 0 && (
          <p className={styles.empty}>{t('Travel information coming soon.')}</p>
        )}

        {venues.length > 0 && destinationPanels}
      </div>
    </section>
  );
}
