import Image from 'next/image';
import styles from './SignatureMotif.module.css';

interface SignatureMotifProps {
  config: any;
}

export default function SignatureMotif({ config }: SignatureMotifProps) {
  const hasMonogram = Boolean(config.MONOGRAM_IMAGE);
  const hasTextMotif = Boolean(config.SIGNATURE_MOTIF);

  if (config.ENABLE_MOTIF === false || (!hasMonogram && !hasTextMotif)) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.line} />
      {hasMonogram ? (
        <Image
          src={config.MONOGRAM_IMAGE}
          alt={config.MONOGRAM_ALT || ''}
          width={96}
          height={96}
          unoptimized
          className={styles.monogram}
        />
      ) : (
        <span className={styles.text}>{config.SIGNATURE_MOTIF}</span>
      )}
      <div className={styles.line} />
    </div>
  );
}
