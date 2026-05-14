'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './SectionWallpaper.module.css';

type WallpaperTone = 'light' | 'dark' | 'paper';

export default function SectionWallpaper({
  src,
  alt = '',
  tone = 'light',
}: {
  src?: string;
  alt?: string;
  tone?: WallpaperTone;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div className={`${styles.wallpaper} ${styles[tone]}`} aria-hidden={!alt}>
      <Image
        src={src}
        alt={alt}
        fill
        className={styles.image}
        sizes="100vw"
        onError={() => setFailed(true)}
      />
      <div className={styles.overlay} />
    </div>
  );
}
