'use client';

import { useReveal } from '@/hooks/useReveal';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import { handleSectionLinkClick } from '@/lib/scroll';
import { useSiteText } from '@/lib/sitePreferences';
import styles from './ClosingSection.module.css';

export default function ClosingSection({ config, globalConfig }: { config?: any, globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.3 });
  const { t } = useSiteText();

  const heading   = config?.heading  || 'We cannot wait to celebrate with you.';
  const signOff   = config?.signOff  || '';
  const date      = config?.date     || '';
  const venueText = config?.venueText || [globalConfig?.VENUE_NAME, globalConfig?.VENUE_DAY_TWO_NAME].filter(Boolean).join('\n');
  const mediaSrc  = config?.mediaUrl || '/media/couple-closing.jpg';
  const imageAlt  = config?.imageAlt || (signOff || 'The couple');
  const ctaLabel  = config?.ctaLabel || 'RSVP';
  const ctaLink   = config?.ctaLink  || '#rsvp';
  const whatsappLabel = !globalConfig?.WHATSAPP_LABEL || globalConfig.WHATSAPP_LABEL === 'Message Wedding Concierge'
    ? 'Message Us'
    : globalConfig.WHATSAPP_LABEL;
  
  const isExternalLink = ctaLink.startsWith('http');
  const getCtaScrollTarget = () => {
    if (ctaLink !== '#rsvp') return ctaLink;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return '#rsvp-form';
    }
    return ctaLink;
  };

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
        <h2 className={styles.message}>{t(heading)}</h2>

        {signOff && (
          <p className={styles.signOff}>{t(signOff)}</p>
        )}

        {date && <p className={styles.date}>{t(date)}</p>}
        {venueText && (
          <p className={styles.venueText}>
            {String(venueText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => (
              <span key={line}>{t(line)}</span>
            ))}
          </p>
        )}
        
        <div className={styles.ctaGroup}>
          <a
            href={ctaLink}
            className={styles.rsvpButton}
            onClick={(e) => {
              trackEvent('rsvp_cta_clicked');
              if (!isExternalLink) handleSectionLinkClick(e, getCtaScrollTarget());
            }}
          >
            {t(ctaLabel)}
          </a>
          
          {globalConfig?.WHATSAPP_NUMBER && (
            <a 
              href={`https://wa.me/${globalConfig.WHATSAPP_NUMBER.replace(/\D/g,'')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappButton}
              onClick={() => trackEvent('whatsapp_cta_clicked')}
            >
              {t(whatsappLabel)}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
