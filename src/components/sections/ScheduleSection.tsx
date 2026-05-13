'use client';

import { useReveal } from '@/hooks/useReveal';
import styles from './ScheduleSection.module.css';

interface ScheduleEvent {
  time: string;
  title: string;
  location: string;
  notes?: string;
  dressCode?: string;
}

interface ScheduleDay {
  label: string;
  date: string;
  events: ScheduleEvent[];
}

// Hardcoded defaults — shown when no CMS days are configured yet
const defaultDays: ScheduleDay[] = [
  {
    label: 'Day One',
    date: 'Friday, 12 December 2026',
    events: [
      { time: '6:30 PM', title: 'Guest Arrival', location: 'Hotel Lobby', notes: 'Please proceed to the Grand Ballroom on Level 3.' },
      { time: '7:00 PM', title: 'Dinner Reception', location: 'Grand Ballroom, Level 3', notes: '', dressCode: 'Smart Formal' },
    ],
  },
];

export default function ScheduleSection({ config }: { config?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.1 });

  const heading = config?.heading || 'The Weekend';
  const intro = config?.bodyCopy || '';
  const days: ScheduleDay[] = config?.days?.length > 0 ? config.days : defaultDays;

  return (
    <section id="schedule" className={styles.schedule} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.content}>
        <h2 className={`${styles.title} ${isVisible ? styles.visible : ''}`}>{heading}</h2>
        {intro && <p className={styles.intro}>{intro}</p>}

        {days.map((day, dayIndex) => (
          <div key={dayIndex} className={`${styles.dayGroup} ${isVisible ? styles.visible : ''}`} style={{ transitionDelay: `${dayIndex * 0.1}s` }}>
            <div className={styles.dayHeader}>
              <span className={styles.dayLabel}>{day.label}</span>
              <span className={styles.dayDate}>{day.date}</span>
            </div>

            <div className={styles.timeline}>
              {day.events.map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className={`${styles.event} ${isVisible ? styles.visible : ''}`}
                  style={{ transitionDelay: `${0.2 + dayIndex * 0.1 + eventIndex * 0.12}s` }}
                >
                  <div className={styles.timeColumn}>
                    <span className={styles.time}>{event.time}</span>
                  </div>
                  <div className={styles.eventContent}>
                    <h3 className={styles.eventName}>{event.title}</h3>
                    <div className={styles.eventDetails}>
                      <span className={styles.location}>{event.location}</span>
                      {event.notes && <span>{event.notes}</span>}
                      {event.dressCode && (
                        <span className={styles.dressCode}>Dress Code: {event.dressCode}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
