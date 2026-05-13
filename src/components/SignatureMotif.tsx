import styles from './SignatureMotif.module.css';

interface SignatureMotifProps {
  config: any;
}

export default function SignatureMotif({ config }: SignatureMotifProps) {
  if (config.ENABLE_MOTIF === false || !config.SIGNATURE_MOTIF) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.line} />
      <span className={styles.text}>{config.SIGNATURE_MOTIF}</span>
      <div className={styles.line} />
    </div>
  );
}
