'use client';

import { useReveal } from '@/hooks/useReveal';
import Image from 'next/image';
import styles from './GalleryInterludeSection.module.css';

interface CollageImage {
  url: string;
  alt?: string;
}

export default function GalleryInterludeSection({ config }: { config?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.2 });

  if (!config || !config.collageImages || config.collageImages.length === 0) return null;

  const images: CollageImage[] = config.collageImages;
  const motionEnabled = config.motionEnabled !== false && images.length > 1;
  const motionSpeed = Number(config.motionSpeed || 1);
  const imageScale = Number(config.imageScale || 1);
  const duration = `${Math.max(28, 54 / Math.max(motionSpeed, 0.5))}s`;
  const renderSlides = (items: CollageImage[], duplicate = false) => (
    items.map((img, i) => (
      <figure
        key={`${duplicate ? 'duplicate' : 'primary'}-${img.url}-${i}`}
        className={styles.slide}
        aria-hidden={duplicate}
      >
        <Image
          src={img.url}
          alt={duplicate ? '' : (img.alt || 'Wedding detail')}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 92vw, 82vw"
        />
      </figure>
    ))
  );

  return (
    <section id="gallery_interlude" className={styles.container} ref={ref as React.RefObject<HTMLElement>}>
      <div
        className={`${styles.sliderShell} ${motionEnabled ? styles.motionEnabled : ''} ${isVisible ? styles.visible : ''}`}
        style={{
          '--gallery-duration': duration,
          '--gallery-image-scale': imageScale,
        } as React.CSSProperties}
      >
        <div className={styles.sliderTrack} tabIndex={0} aria-label="Wedding photo gallery">
          {renderSlides(images)}
          {motionEnabled && renderSlides(images, true)}
        </div>
      </div>
      
      {config.bodyCopy && (
        <div className={`${styles.captionWrapper} ${isVisible ? styles.visible : ''}`}>
          <p className={styles.caption}>{config.bodyCopy}</p>
        </div>
      )}
    </section>
  );
}
