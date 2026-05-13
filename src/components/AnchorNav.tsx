'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './AnchorNav.module.css';
import { useState, useEffect } from 'react';
import { handleSectionLinkClick, MAIN_SCROLL_CONTAINER_ID } from '@/lib/scroll';
import { useSiteText } from '@/lib/sitePreferences';

export default function AnchorNav({ globalConfig }: { globalConfig?: Record<string, unknown> }) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isRsvpVisible, setIsRsvpVisible] = useState(false);
  const { language, fontScale, cycleFontScale, toggleLanguage, t } = useSiteText();
  const motif = typeof globalConfig?.SIGNATURE_MOTIF === 'string' ? globalConfig.SIGNATURE_MOTIF : 'R & S';
  const showMotif = globalConfig?.ENABLE_MOTIF !== false;
  const monogramImage = typeof globalConfig?.MONOGRAM_IMAGE === 'string' ? globalConfig.MONOGRAM_IMAGE : '';
  const monogramAlt = typeof globalConfig?.MONOGRAM_ALT === 'string' ? globalConfig.MONOGRAM_ALT : motif;

  const navItems = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'venue_reveal', label: 'Venue' },
    { id: 'travel', label: 'Travel' },
    { href: '/seating', label: 'Seating' },
    { id: 'faq', label: 'Details' },
    { id: 'rsvp', label: 'RSVP' },
  ] as const;

  useEffect(() => {
    // Observe the hero section to show/hide the nav
    const hero = document.getElementById('hero');
    const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);

    if (!hero || !scrollContainer) return;
    const usesInternalScroll = window.getComputedStyle(scrollContainer).overflowY !== 'visible';

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        // Hide nav when hero is prominently visible (>30%), show when scrolled past
        setIsHeroVisible(entry.intersectionRatio > 0.3);
      },
      {
        root: usesInternalScroll ? scrollContainer : null,
        threshold: [0, 0.3, 0.6, 1],
      }
    );
    heroObserver.observe(hero);

    const rsvp = document.getElementById('rsvp');
    const rsvpObserver = rsvp
      ? new IntersectionObserver(
          ([entry]) => {
            setIsRsvpVisible(entry.intersectionRatio > 0.35);
          },
          {
            root: usesInternalScroll ? scrollContainer : null,
            threshold: [0, 0.35, 0.65, 1],
          }
        )
      : null;
    if (rsvp && rsvpObserver) rsvpObserver.observe(rsvp);

    // Observe all nav sections for active highlighting
    const sectionIds = navItems.flatMap((item) => ('id' in item ? [item.id] : []));
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: usesInternalScroll ? scrollContainer : null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });

    return () => {
      heroObserver.disconnect();
      rsvpObserver?.disconnect();
      sectionObserver.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    handleSectionLinkClick(e, `#${id}`);
  };

  return (
    <>
      <nav
        className={`${styles.nav} ${isHeroVisible ? styles.hidden : ''}`}
        aria-label="Main navigation"
      >
        {showMotif && (
          <a
            href="#hero"
            className={styles.brand}
            aria-label="Return to the top"
            onClick={(e) => handleClick(e, 'hero')}
          >
            {monogramImage ? (
              <Image
                src={monogramImage}
                alt={monogramAlt}
                width={72}
                height={40}
                unoptimized
                className={styles.brandImage}
              />
            ) : (
              motif
            )}
          </a>
        )}
        <ul className={styles.list}>
          {navItems.map((item) => (
            <li key={'id' in item ? item.id : item.href}>
              {'href' in item ? (
                <Link href={item.href} className={styles.link}>
                  {t(item.label)}
                </Link>
              ) : (
                <a
                  href={`#${item.id}`}
                  className={`${styles.link} ${activeSection === item.id ? styles.active : ''}`}
                  onClick={(e) => handleClick(e, item.id)}
                >
                  {t(item.label)}
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className={styles.controls} aria-label="Accessibility options">
          <button
            type="button"
            className={styles.controlButton}
            onClick={cycleFontScale}
            aria-label={`${t('Text size')} ${fontScale}%`}
          >
            A<span>{fontScale}</span>
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={toggleLanguage}
            aria-label={language === 'zh' ? t('Show English') : t('Translate to Mandarin Chinese')}
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </nav>
      <a
        href="#rsvp-form"
        className={`${styles.mobileCta} ${isHeroVisible || isRsvpVisible ? styles.mobileCtaHidden : ''}`}
        onClick={(e) => handleClick(e, 'rsvp-form')}
      >
        {t('RSVP')}
      </a>
    </>
  );
}
