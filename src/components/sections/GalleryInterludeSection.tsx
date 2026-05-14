'use client';

import { useReveal } from '@/hooks/useReveal';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useSiteText } from '@/lib/sitePreferences';
import styles from './GalleryInterludeSection.module.css';

interface CollageImage {
  url: string;
  alt?: string;
}

const EMPTY_COLLAGE_IMAGES: CollageImage[] = [];

export default function GalleryInterludeSection({ config }: { config?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.2 });
  const { t } = useSiteText();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffledImages, setShuffledImages] = useState<CollageImage[] | null>(null);
  const sourceImages: CollageImage[] = config?.collageImages ?? EMPTY_COLLAGE_IMAGES;

  const images: CollageImage[] = shuffledImages || sourceImages;
  const motionEnabled = config?.motionEnabled !== false && images.length > 1;
  const motionSpeed = Number(config?.motionSpeed || 1);
  const imageScale = Number(config?.imageScale || 1);
  const duration = `${Math.max(28, 54 / Math.max(motionSpeed, 0.5))}s`;
  const renderSlides = (items: CollageImage[], duplicate = false) => (
    items.map((img, i) => (
      <figure
        key={`${duplicate ? 'duplicate' : 'primary'}-${img.url}-${i}`}
        className={`${styles.slide} ${duplicate ? styles.duplicateSlide : ''}`}
        aria-hidden={duplicate}
      >
        <Image
          src={img.url}
          alt={duplicate ? '' : t(img.alt || 'Wedding detail')}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 92vw, 82vw"
        />
      </figure>
    ))
  );

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || images.length === 0) return;

    const firstSlide = track.querySelector<HTMLElement>(`.${styles.slide}`);
    if (!firstSlide) return;

    const trackStyles = window.getComputedStyle(track);
    const gap = parseFloat(trackStyles.columnGap || trackStyles.gap || '0') || 0;
    const slideSpan = firstSlide.offsetWidth + gap;
    if (!slideSpan) return;

    setActiveIndex(Math.round(track.scrollLeft / slideSpan) % images.length);
  };

  const scrollToSlide = (index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const slides = track.querySelectorAll<HTMLElement>(`.${styles.slide}:not(.${styles.duplicateSlide})`);
    slides[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  useEffect(() => {
    if (sourceImages.length === 0) return;
    setActiveIndex(0);
    setShuffledImages(() => {
      const next = [...sourceImages];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, [sourceImages]);

  if (!config || sourceImages.length === 0) return null;

  return (
    <section id="gallery_interlude" className={styles.container} ref={ref as React.RefObject<HTMLElement>}>
      <div
        className={`${styles.sliderShell} ${motionEnabled ? styles.motionEnabled : ''} ${isVisible ? styles.visible : ''}`}
        style={{
          '--gallery-duration': duration,
          '--gallery-image-scale': imageScale,
        } as React.CSSProperties}
      >
        <div
          className={styles.sliderTrack}
          tabIndex={0}
          aria-label={t('Wedding photo gallery')}
          ref={trackRef}
          onScroll={handleScroll}
        >
          {renderSlides(images)}
          {motionEnabled && renderSlides(images, true)}
        </div>
      </div>

      {images.length > 1 && (
        <div className={styles.mobileDots} aria-label={t('Gallery slides')}>
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              className={index === activeIndex ? styles.activeDot : ''}
              onClick={() => scrollToSlide(index)}
              aria-label={t('Show gallery image {number}', { number: index + 1 })}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}
      
      {config.bodyCopy && (
        <div className={`${styles.captionWrapper} ${isVisible ? styles.visible : ''}`}>
          <p className={styles.caption}>{t(config.bodyCopy)}</p>
        </div>
      )}
    </section>
  );
}
