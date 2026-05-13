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
  const sliderImages = [...images, ...images];

  return (
    <section id="gallery_interlude" className={styles.container} ref={ref as React.RefObject<HTMLElement>}>
      <div className={`${styles.sliderShell} ${isVisible ? styles.visible : ''}`}>
        <div className={styles.sliderTrack}>
          {sliderImages.map((img, i) => (
            <figure key={`${img.url}-${i}`} className={styles.slide}>
              <Image
                src={img.url}
                alt={img.alt || 'Wedding detail'}
                fill
                className={styles.image}
                sizes="(max-width: 768px) 82vw, 34vw"
              />
            </figure>
          ))}
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
