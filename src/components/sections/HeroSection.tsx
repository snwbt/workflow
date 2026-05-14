'use client';

import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import { handleSectionLinkClick } from '@/lib/scroll';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSiteText } from '@/lib/sitePreferences';
import styles from './HeroSection.module.css';
import { useEffect, useState } from 'react';

interface CollageImage {
  url: string;
  alt?: string;
}

export default function HeroSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, progress } = useScrollProgress();
  const { t } = useSiteText();
  const [activeMobileImage, setActiveMobileImage] = useState(0);

  useEffect(() => {
    trackEvent('hero_media_loaded');
  }, []);

  // Dynamic values from CMS, with sensible fallbacks
  const heading = config?.heading || 'Russell & Siaw Min';
  const eyebrow = config?.eyebrow || 'The Wedding Of';
  const date = config?.date || '';
  const venueText = config?.venueText || [globalConfig?.VENUE_NAME, globalConfig?.VENUE_DAY_TWO_NAME].filter(Boolean).join('\n');
  const ctaLabel = config?.ctaLabel || 'RSVP';
  const ctaLink = config?.ctaLink || '#rsvp';

  const collageImages: CollageImage[] = config?.collageImages?.length >= 1
    ? config.collageImages
    : [
        { url: '/media/hero-collage-1.png', alt: 'The couple' },
        { url: '/media/hero-collage-2.png', alt: 'Wedding details' },
        { url: '/media/hero-collage-3.png', alt: 'Candid moment' },
      ];

  const img0 = collageImages[0] || { url: '/media/hero-collage-1.png', alt: 'The couple' };
  const img1 = collageImages[1] || null;
  const img2 = collageImages[2] || null;
  const headingParts = heading.split(/\s*&\s*/);
  const hasStyledAmpersand = headingParts.length === 2 && headingParts.every(Boolean);
  const venueLines = String(venueText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const isExternalLink = ctaLink.startsWith('http');
  const getCtaScrollTarget = () => {
    return ctaLink;
  };

  useEffect(() => {
    if (collageImages.length <= 1) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setActiveMobileImage((current) => (current + 1) % collageImages.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [collageImages.length]);

  return (
    <section id="hero" className={styles.hero} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.collageContainer}>
        {/* Main image */}
        <div
          className={`${styles.collageItem} ${styles.imageMain}`}
          style={{
            opacity: 1 - progress * 0.16,
            transform: `scale(${1 + progress * 0.05}) translateY(${progress * 20}px)`,
          }}
        >
          <Image
            src={img0.url}
            alt={img0.alt || 'The couple'}
            fill
            priority
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        </div>

        {/* Supporting image 1 */}
        {img1 && (
          <div
            className={`${styles.collageItem} ${styles.imageSmall1}`}
            style={{
              opacity: 1 - progress * 0.22,
              transform: `scale(${1 + progress * 0.03}) translateY(${progress * -30}px)`,
            }}
          >
            <Image
              src={img1.url}
              alt={img1.alt || 'Wedding detail'}
              fill
              priority
              className={styles.image}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        )}

        {/* Supporting image 2 */}
        {img2 && (
          <div
            className={`${styles.collageItem} ${styles.imageSmall2}`}
            style={{
              opacity: 1 - progress * 0.18,
              transform: `scale(${1 + progress * 0.04}) translateY(${progress * -15}px)`,
            }}
          >
            <Image
              src={img2.url}
              alt={img2.alt || 'Candid moment'}
              fill
              priority
              className={styles.image}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        )}

        <div className={styles.mobileCarousel} aria-label="Wedding photo carousel">
          {collageImages.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className={`${styles.mobileSlide} ${index === activeMobileImage ? styles.mobileSlideActive : ''}`}
              aria-hidden={index !== activeMobileImage}
            >
              <Image
                src={img.url}
                alt={img.alt || 'The couple'}
                fill
                priority={index === 0}
                className={styles.image}
                sizes="100vw"
              />
            </div>
          ))}
          <div className={styles.mobileDots} aria-hidden="true">
            {collageImages.map((_, index) => (
              <span key={index} className={index === activeMobileImage ? styles.mobileDotActive : ''} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.contentOverlay}>
        <div className={styles.content}>
          {eyebrow && <span className={styles.eyebrow}>{t(eyebrow)}</span>}
          <h1 className={styles.names}>
            {hasStyledAmpersand ? (
              <>
                <span className={styles.namePart}>{headingParts[0]}</span>
                <span className={styles.ampersand} aria-label="and">&</span>
                <span className={styles.namePart}>{headingParts[1]}</span>
              </>
            ) : (
              heading
            )}
          </h1>
          <div className={styles.details}>
            {date && <span>{t(date)}</span>}
            {venueLines.map((line) => (
              <span key={line}>{t(line)}</span>
            ))}
          </div>

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
        </div>
      </div>
    </section>
  );
}
