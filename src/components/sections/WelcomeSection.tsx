'use client';

import { useReveal } from '@/hooks/useReveal';
import Image from 'next/image';
import styles from './WelcomeSection.module.css';

export default function WelcomeSection({ config }: { config?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.3 });

  const heading = config?.heading || 'Welcome';
  const note = config?.bodyCopy || 'We are so thrilled to share this special moment with the people we love most. Thank you for your endless support, laughter, and love.';
  const mediaSrc = config?.mediaUrl || '/media/couple-welcome.jpg';

  return (
    <section id="welcome" ref={ref as React.RefObject<HTMLElement>} className={styles.welcome}>
      <div className={styles.content}>
        <div className={`${styles.textColumn} ${isVisible ? styles.visible : ''}`}>
          {heading && <h2 className={styles.heading}>{heading}</h2>}
          <p className={styles.note}>
            {note}
          </p>
        </div>
        
        <div className={`${styles.imageWrapper} ${isVisible ? styles.visible : ''}`}>
          {mediaSrc.match(/\.(mp4|webm)$/i) ? (
            <video
              src={mediaSrc}
              autoPlay
              loop
              muted
              playsInline
              className={styles.image}
              style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '2px' }}
            />
          ) : (
            <Image
              src={mediaSrc}
              alt={heading}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 100vw, 600px"
            />
          )}
        </div>
      </div>
    </section>
  );
}
