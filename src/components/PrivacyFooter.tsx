import Link from 'next/link';

export default function PrivacyFooter() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: 'var(--spacing-8) var(--spacing-4)',
      marginTop: 'auto',
      borderTop: '1px solid var(--color-border)',
      color: 'var(--color-text-secondary)',
      fontSize: '0.75rem',
      lineHeight: '1.5'
    }}>
      <p style={{ marginBottom: 'var(--spacing-2)' }}>
        <strong>Privacy Notice:</strong> We collect your name, RSVP status, dietary requirements, and meal choices solely to plan our wedding. 
      </p>
      <p>
        Your information is kept private and will be securely deleted 90 days after the event. 
        It will not be shared with any third parties outside of our venue and catering partners.
      </p>
    </footer>
  );
}
