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
  const noteEnabled = config?.noteEnabled !== false;
  const noteHeading = config?.noteHeading || '';
  const noteBody = config?.noteBody || '';
  const hasNote = noteEnabled && Boolean(noteHeading.trim() || noteBody.trim());
  const days: ScheduleDay[] = config?.days?.length > 0 ? config.days : defaultDays;
  const displayedDays = days.slice(0, 2);
  const maxEvents = Math.max(...displayedDays.map((day) => day.events.length), 0);
  const rows = Array.from({ length: maxEvents });

  const renderEvent = (
    event: ScheduleEvent | undefined,
    key: string,
    transitionDelay: string,
    isPlaceholder = false
  ) => (
    <div
      key={key}
      className={`${styles.event} ${isPlaceholder ? styles.placeholderEvent : ''} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay }}
      aria-hidden={isPlaceholder}
    >
      {event && (
        <>
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
        </>
      )}
    </div>
  );

  return (
    <section id="schedule" className={styles.schedule} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.content}>
        <h2 className={`${styles.title} ${isVisible ? styles.visible : ''}`}>{heading}</h2>
        {intro && <p className={styles.intro}>{intro}</p>}

        <div className={`${styles.desktopSchedule} ${displayedDays.length === 1 ? styles.singleDay : ''} ${isVisible ? styles.visible : ''}`}>
          {displayedDays.map((day, dayIndex) => (
            <div key={dayIndex} className={styles.dayHeader}>
              <span className={styles.dayLabel}>{day.label}</span>
              <span className={styles.dayDate}>{day.date}</span>
            </div>
          ))}
          {rows.map((_, rowIndex) => (
            displayedDays.map((day, dayIndex) => (
              renderEvent(
                day.events[rowIndex],
                `${dayIndex}-${rowIndex}`,
                `${0.12 + rowIndex * 0.05}s`,
                !day.events[rowIndex]
              )
            ))
          ))}
        </div>

        <div className={styles.mobileDays}>
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className={`${styles.dayGroup} ${isVisible ? styles.visible : ''}`} style={{ transitionDelay: `${dayIndex * 0.1}s` }}>
              <div className={styles.dayHeader}>
                <span className={styles.dayLabel}>{day.label}</span>
                <span className={styles.dayDate}>{day.date}</span>
              </div>

              <div className={styles.timeline}>
                {day.events.map((event, eventIndex) => (
                  renderEvent(event, `${dayIndex}-mobile-${eventIndex}`, `${0.12 + eventIndex * 0.05}s`)
                ))}
              </div>
            </div>
          ))}
        </div>

        {hasNote && (
          <aside
            className={`${styles.scheduleNote} ${isVisible ? styles.visible : ''}`}
            style={{ transitionDelay: '0.28s' }}
          >
            {noteHeading && <h3 className={styles.noteHeading}>{noteHeading}</h3>}
            {noteBody && <p className={styles.noteBody}>{noteBody}</p>}
          </aside>
        )}
      </div>
    </section>
  );
}
