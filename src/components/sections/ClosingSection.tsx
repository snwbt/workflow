'use client';

import { useReveal } from '@/hooks/useReveal';
import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import styles from './ClosingSection.module.css';

export default function ClosingSection({ config, globalConfig }: { config?: any, globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.3 });

  const heading   = config?.heading  || 'We cannot wait to celebrate with you.';
  const signOff   = config?.signOff  || '';
  const date      = config?.date     || '';
  const venueText = config?.venueText || globalConfig?.VENUE_NAME || '';
  const mediaSrc  = config?.mediaUrl || '/media/couple-closing.jpg';
  const imageAlt  = config?.imageAlt || (signOff || 'The couple');
  const ctaLabel  = config?.ctaLabel || 'RSVP';
  const ctaLink   = config?.ctaLink  || '#rsvp';
  
  const isExternalLink = ctaLink.startsWith('http');

  return (
    <section id="closing" ref={ref as React.RefObject<HTMLElement>} className={styles.closing}>
      <div className={styles.imageWrapper}>
        <Image 
          src={mediaSrc} 
          alt={imageAlt}
          fill 
          className={styles.image} 
          sizes="100vw"
          priority={false}
        />
        <div className={styles.overlay} />
      </div>
      
      <div className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
        <h2 className={styles.message}>{heading}</h2>

        {signOff && (
          <p className={styles.signOff}>{signOff}</p>
        )}

        {date && <p className={styles.date}>{date}</p>}
        {venueText && <p className={styles.venueText}>{venueText}</p>}
        
        <div className={styles.ctaGroup}>
          {isExternalLink ? (
            <a 
              href={ctaLink} 
              className={styles.rsvpButton}
              onClick={() => trackEvent('rsvp_cta_clicked')}
            >
              {ctaLabel}
            </a>
          ) : (
            <Link 
              href={ctaLink} 
              className={styles.rsvpButton}
              onClick={() => trackEvent('rsvp_cta_clicked')}
            >
              {ctaLabel}
            </Link>
          )}
          
          {globalConfig?.WHATSAPP_NUMBER && (
            <a 
              href={`https://wa.me/${globalConfig.WHATSAPP_NUMBER.replace(/\D/g,'')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappButton}
              onClick={() => trackEvent('whatsapp_cta_clicked')}
            >
              {globalConfig.WHATSAPP_LABEL || 'Wedding Concierge'}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
