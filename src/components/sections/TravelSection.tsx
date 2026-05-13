'use client';

import { useReveal } from '@/hooks/useReveal';
import { getGoogleMapsUrl, getWeddingVenues, type WeddingVenue } from '@/lib/venues';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import styles from './TravelSection.module.css';

interface TravelCard {
  mode: string;
  title: string;
  content: string;
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

function VenueMap({ venue }: { venue: WeddingVenue }) {
  const hasCoordinates = venue.lat !== undefined && venue.lng !== undefined;
  const mapsUrl = getGoogleMapsUrl(venue);

  if (!hasCoordinates || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={styles.mapFallback}>
        <span>{venue.address || venue.name}</span>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.directionsBtn}>
            Open Map
          </a>
        )}
      </div>
    );
  }

  const center = { lat: venue.lat!, lng: venue.lng! };

  return (
    <div className={styles.mapFrame}>
      <Map
        defaultCenter={center}
        defaultZoom={16}
        gestureHandling="cooperative"
        disableDefaultUI
        mapId="wedding-travel-map"
      >
        <Marker position={center} />
      </Map>
    </div>
  );
}

function DestinationPanel({ venue, index, isVisible }: { venue: WeddingVenue; index: number; isVisible: boolean }) {
  const cards = getTravelCards(venue);
  const mapsUrl = getGoogleMapsUrl(venue);

  return (
    <article
      className={`${styles.destination} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className={styles.destinationHeader}>
        <span className={styles.dateLabel}>{venue.dateLabel}</span>
        <h3 className={styles.venueName}>{venue.name}</h3>
        {venue.address && <p className={styles.venueAddress}>{venue.address}</p>}
        {venue.arrivalNote && <p className={styles.arrivalNote}>{venue.arrivalNote}</p>}
      </div>

      <VenueMap venue={venue} />

      {cards.length > 0 && (
        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div key={`${venue.key}-${card.mode}`} className={styles.card}>
              <span className={styles.cardMode}>{card.mode}</span>
              <h4 className={styles.cardTitle}>{card.title}</h4>
              <p className={styles.cardContent}>{card.content}</p>
            </div>
          ))}
        </div>
      )}

      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.panelDirectionsBtn}>
          Get Directions
        </a>
      )}
    </article>
  );
}

export default function TravelSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.1 });

  const heading = config?.heading || 'Getting Here';
  const subheading = config?.bodyCopy || '';
  const venues = getWeddingVenues(globalConfig);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const destinationPanels = (
    <div className={`${styles.destinationsGrid} ${venues.length === 1 ? styles.singleDestination : ''}`}>
      {venues.map((venue, index) => (
        <DestinationPanel key={venue.key} venue={venue} index={index} isVisible={isVisible} />
      ))}
    </div>
  );

  return (
    <section id="travel" className={styles.travel} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.content}>
        <div className={`${styles.header} ${isVisible ? styles.visible : ''}`}>
          <h2 className={styles.title}>{heading}</h2>
          {subheading && <p className={styles.subtitle}>{subheading}</p>}
        </div>

        {venues.length === 0 && (
          <p className={styles.empty}>Travel information coming soon.</p>
        )}

        {venues.length > 0 && (
          apiKey ? <APIProvider apiKey={apiKey}>{destinationPanels}</APIProvider> : destinationPanels
        )}
      </div>
    </section>
  );
}
