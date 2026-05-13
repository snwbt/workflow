'use client';

import { useScrollProgress } from '@/hooks/useScrollProgress';
import Image from 'next/image';
import styles from './VenueSection.module.css';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { createIcsDownloadUrl } from '@/lib/calendar';

export default function VenueSection({ globalConfig }: { globalConfig?: any }) {
  const { ref, progress } = useScrollProgress();
  const [icsUrl, setIcsUrl] = useState<string>('');

  useEffect(() => {
    if (globalConfig) {
      setIcsUrl(createIcsDownloadUrl({
        title: globalConfig.VENUE_NAME || 'Wedding',
        description: 'Join us to celebrate!',
        location: globalConfig.VENUE_ADDRESS || '',
        startTime: new Date('2026-09-15T15:00:00Z'), // Ideally from events, but hardcoded for now
        endTime: new Date('2026-09-15T23:00:00Z')
      }));
    }
  }, [globalConfig]);

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    gestureHandling: 'cooperative',
    styles: [
      {
        "featureType": "all",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#faf8f4" }]
      },
      {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#d4c5a9" }]
      },
      {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#ffffff" }]
      },
      {
        "featureType": "poi",
        "stylers": [{ "visibility": "off" }]
      },
      {
        "featureType": "transit",
        "stylers": [{ "visibility": "off" }]
      }
    ]
  };

  const showMap = globalConfig?.VENUE_LAT && globalConfig?.VENUE_LNG && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <section id="venue" className={styles.venueContainer} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.stickyContent}>
        
        {/* Background that slowly scales as we scroll through the 300vh section */}
        <div 
          className={styles.imageWrapper}
          style={{ transform: `scale(${1 + progress * 0.08})` }}
        >
          <Image
            src="/media/venue-pinned.png"
            alt="The Grand Estate Venue"
            fill
            className={styles.image}
            priority
            sizes="100vw"
          />
          <div className={styles.overlay} />
        </div>

        {/* Text moments that crossfade based on scroll progress */}
        <div className={styles.momentsContainer}>
          
          <div className={`${styles.moment} ${progress > 0.1 && progress < 0.4 ? styles.active : ''}`}>
            <h2>The Grand Estate</h2>
            <p>Where our story begins.</p>
          </div>

          <div className={`${styles.moment} ${progress >= 0.4 && progress < 0.7 ? styles.active : ''}`}>
            <h2>Historic Elegance</h2>
            <p>Nestled in the countryside, featuring centuries-old gardens and classic architecture.</p>
          </div>

          <div className={`${styles.moment} ${progress >= 0.7 && progress < 0.95 ? styles.active : ''}`}>
            {showMap ? (
              <div className={styles.mapCard}>
                <div className={styles.mapHeader}>
                  <h2 style={{fontSize: '2rem', marginBottom: '0.5rem'}}>{globalConfig.VENUE_NAME}</h2>
                  <p style={{marginBottom: '1rem', color: 'var(--color-champagne)'}}>{globalConfig.VENUE_ADDRESS}</p>
                  {globalConfig.VENUE_ARRIVAL_NOTE && <p style={{fontSize: '0.875rem', marginBottom: '1rem'}}>{globalConfig.VENUE_ARRIVAL_NOTE}</p>}
                  
                  <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem'}}>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${globalConfig.VENUE_LAT},${globalConfig.VENUE_LNG}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapButton}
                    >
                      Get Directions
                    </a>
                    {icsUrl && (
                      <a href={icsUrl} download="wedding.ics" className={styles.mapButtonSecondary}>
                        Add to Calendar
                      </a>
                    )}
                  </div>
                </div>
                
                <div className={styles.mapEmbed}>
                  <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                    <Map 
                      defaultCenter={{lat: globalConfig.VENUE_LAT, lng: globalConfig.VENUE_LNG}} 
                      defaultZoom={14}
                      disableDefaultUI={true}
                      zoomControl={false}
                      gestureHandling={'cooperative'}
                      styles={mapOptions.styles}
                    >
                      <Marker position={{lat: globalConfig.VENUE_LAT, lng: globalConfig.VENUE_LNG}} />
                    </Map>
                  </APIProvider>
                </div>
              </div>
            ) : (
              <>
                <h2>Coming Soon</h2>
                <p>More details about the venue will be available closer to the date.</p>
                {icsUrl && (
                  <a href={icsUrl} download="wedding.ics" style={{display: 'inline-block', marginTop: '2rem', borderBottom: '1px solid', paddingBottom: '2px', color: 'var(--color-champagne)', textDecoration: 'none'}}>
                    Add to Calendar
                  </a>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
