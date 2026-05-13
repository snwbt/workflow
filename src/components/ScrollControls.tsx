'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAIN_SCROLL_CONTAINER_ID, scrollToPageSection } from '@/lib/scroll';
import styles from './ScrollControls.module.css';

interface ScrollSection {
  id: string;
  label: string;
}

export default function ScrollControls({ sections }: { sections: ScrollSection[] }) {
  const visibleSections = useMemo(() => sections.filter((section) => section.id), [sections]);
  const [activeId, setActiveId] = useState(visibleSections[0]?.id || '');

  useEffect(() => {
    const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
    if (!scrollContainer || visibleSections.length === 0) return;

    const usesInternalScroll = window.getComputedStyle(scrollContainer).overflowY !== 'visible';
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: usesInternalScroll ? scrollContainer : null,
        rootMargin: '-28% 0px -28% 0px',
        threshold: [0.2, 0.45, 0.7],
      }
    );

    visibleSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [visibleSections]);

  if (visibleSections.length <= 1) return null;

  const activeIndex = Math.max(
    0,
    visibleSections.findIndex((section) => section.id === activeId)
  );
  const previous = visibleSections[Math.max(0, activeIndex - 1)];
  const next = visibleSections[Math.min(visibleSections.length - 1, activeIndex + 1)];

  return (
    <nav className={styles.controls} aria-label="Section navigation">
      <button
        type="button"
        className={styles.arrow}
        onClick={() => scrollToPageSection(previous.id)}
        disabled={activeIndex === 0}
        aria-label="Scroll to previous section"
      >
        ^
      </button>
      <div className={styles.dots}>
        {visibleSections.map((section) => (
          <button
            type="button"
            key={section.id}
            className={`${styles.dot} ${section.id === activeId ? styles.active : ''}`}
            onClick={() => scrollToPageSection(section.id)}
            aria-label={`Scroll to ${section.label}`}
            aria-current={section.id === activeId ? 'true' : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => scrollToPageSection(next.id)}
        disabled={activeIndex === visibleSections.length - 1}
        aria-label="Scroll to next section"
      >
        v
      </button>
    </nav>
  );
}
