'use client';

import { useReveal } from '@/hooks/useReveal';
import { getRsvpReminderText } from '@/lib/eventDisplay';
import styles from './AtAGlanceSection.module.css';

export default function AtAGlanceSection({ config, globalConfig }: { config?: any; globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.2 });

  if (!config) return null;

  const motif = globalConfig?.SIGNATURE_MOTIF || config?.motif || 'R & S';
  const enableMotif = globalConfig?.ENABLE_MOTIF !== false;
  const rsvpText = getRsvpReminderText(globalConfig) || config.rsvpText;

  return (
    <section
      id="at_a_glance"
      className={styles.container}
      ref={ref as React.RefObject<HTMLElement>}
      data-motif={enableMotif ? motif : ''}
    >
      <div className={`${styles.card} ${isVisible ? styles.visible : ''}`}>
        <h2 className={styles.heading}>{config.heading || 'A Weekend in Singapore'}</h2>
        <div className={styles.divider} />
        
        <div className={styles.detailsGrid}>
          {config.date     && <div className={styles.row}><span>{config.date}</span></div>}
          {config.venueText && <div className={styles.row}><span>{config.venueText}</span></div>}
          {config.roomText  && <div className={styles.row}><span>{config.roomText}</span></div>}
          {config.dressCode && <div className={styles.row}><span>{config.dressCode}</span></div>}
          {rsvpText && <div className={styles.row}><span className={styles.highlight}>{rsvpText}</span></div>}
        </div>
      </div>
    </section>
  );
}
