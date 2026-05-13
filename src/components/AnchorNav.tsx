'use client';

import styles from './AnchorNav.module.css';
import { useState, useEffect } from 'react';

export default function AnchorNav({ globalConfig }: { globalConfig?: Record<string, unknown> }) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const motif = typeof globalConfig?.SIGNATURE_MOTIF === 'string' ? globalConfig.SIGNATURE_MOTIF : 'R & S';
  const showMotif = globalConfig?.ENABLE_MOTIF !== false;

  const navItems = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'venue_reveal', label: 'Venue' },
    { id: 'travel', label: 'Travel' },
    { id: 'faq', label: 'Details' },
    { id: 'rsvp', label: 'RSVP' },
  ];

  useEffect(() => {
    // Observe the hero section to show/hide the nav
    const hero = document.getElementById('hero');
    const scrollContainer = document.getElementById('main-scroll-container');

    if (!hero || !scrollContainer) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        // Hide nav when hero is prominently visible (>30%), show when scrolled past
        setIsHeroVisible(entry.intersectionRatio > 0.3);
      },
      {
        root: scrollContainer,
        threshold: [0, 0.3, 0.6, 1],
      }
    );
    heroObserver.observe(hero);

    // Observe all nav sections for active highlighting
    const sectionIds = navItems.map(n => n.id);
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: scrollContainer,
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
      sectionObserver.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const scrollContainer = document.getElementById('main-scroll-container');
    const element = document.getElementById(id);
    if (element && scrollContainer) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
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
          {motif}
        </a>
      )}
      <ul className={styles.list}>
        {navItems.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`${styles.link} ${activeSection === item.id ? styles.active : ''}`}
              onClick={(e) => handleClick(e, item.id)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
