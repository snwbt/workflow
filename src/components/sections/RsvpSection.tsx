'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import styles from './RsvpSection.module.css';
import { trackEvent } from '@/lib/analytics';
import { getRsvpDeadlineDisplay } from '@/lib/eventDisplay';

type AttendanceStatus = 'attending' | 'declined';
type InviteType = 'friday_saturday' | 'saturday_only';
type RsvpStep = 'initial' | 'details' | 'declined' | 'submitting' | 'confirmation';
type EventAnswer = 'yes' | 'no' | '';

const INVITE_LABELS: Record<InviteType, string> = {
  friday_saturday: 'Friday + Saturday',
  saturday_only: 'Saturday only',
};

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function getFirstGuestName(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((name) => name.trim())
    .find(Boolean) || '';
}

export default function RsvpSection({ globalConfig }: { globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.18 });
  const [step, setStep] = useState<RsvpStep>('initial');

  const [inviteCode, setInviteCode] = useState('');
  const [inviteType, setInviteType] = useState<InviteType | null>(null);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [additionalGuestNames, setAdditionalGuestNames] = useState('');
  const [dietary, setDietary] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [dinnerAttendance, setDinnerAttendance] = useState<EventAnswer>('');
  const [massAttendance, setMassAttendance] = useState<EventAnswer>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const fridaySaturdayCode = String(globalConfig?.RSVP_INVITE_CODE_FRIDAY_SATURDAY || 'FRISAT');
  const saturdayOnlyCode = String(globalConfig?.RSVP_INVITE_CODE_SATURDAY || 'SATURDAY');
  const confirmationMessage = globalConfig?.RSVP_CONFIRMATION_MESSAGE || "Thank you! We'll see you in October.";
  const deadlineDisplay = getRsvpDeadlineDisplay(globalConfig);
  const deadlinePassed = globalConfig?.RSVP_DEADLINE && new Date(globalConfig.RSVP_DEADLINE) < new Date();

  const labels = {
    inviteCode: globalConfig?.RSVP_LABEL_INVITE_CODE || 'Invite code',
    guestCount: globalConfig?.RSVP_LABEL_GUEST_COUNT || 'Number of guests attending (including yourself)',
    additionalGuests: globalConfig?.RSVP_LABEL_ADDITIONAL_GUESTS || 'Spouse / plus-one names',
    dietary: globalConfig?.RSVP_LABEL_DIETARY || 'Dietary restrictions',
    accessibility: globalConfig?.RSVP_LABEL_ACCESSIBILITY || 'Accessibility requirements',
    dinner: globalConfig?.RSVP_LABEL_DINNER_ATTENDANCE || 'Will you attend the dinner reception on 23 October?',
    mass: globalConfig?.RSVP_LABEL_MASS_ATTENDANCE || 'Will you attend the solemnisation Mass on 24 October?',
    message: globalConfig?.RSVP_LABEL_MESSAGE || 'Note to the couple',
  };

  const resolveInviteType = (code: string): InviteType | null => {
    const normalized = normalizeCode(code);
    if (normalized && normalized === normalizeCode(fridaySaturdayCode)) return 'friday_saturday';
    if (normalized && normalized === normalizeCode(saturdayOnlyCode)) return 'saturday_only';
    return null;
  };

  const fieldInvalid = (value: unknown) => hasSubmitted && !value;
  const additionalNamesRequired = attendance === 'attending' && guestCount > 1;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    const resolvedType = resolveInviteType(inviteCode);

    if (!resolvedType) {
      setError('Please enter a valid invite code.');
      return;
    }

    if (!guestName.trim() || !email.trim()) {
      setError('Please provide your name and email.');
      return;
    }

    if (!attendance) {
      setError('Please let us know if you can make it.');
      return;
    }

    setInviteType(resolvedType);
    setError('');
    setHasSubmitted(false);
    setStep(attendance === 'attending' ? 'details' : 'declined');
  };

  const validateDetails = () => {
    if (attendance === 'declined') return true;

    if (additionalNamesRequired && !additionalGuestNames.trim()) {
      setError('Please include the names of everyone attending with you.');
      return false;
    }

    if (inviteType === 'friday_saturday' && !dinnerAttendance) {
      setError('Please confirm dinner reception attendance.');
      return false;
    }

    if (!massAttendance) {
      setError('Please confirm solemnisation Mass attendance.');
      return false;
    }

    return true;
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError('');

    if (!inviteType || !attendance || !validateDetails()) return;

    setStep('submitting');

    try {
      const payload = {
        guest_name: guestName.trim(),
        email: email.trim(),
        attendance_status: attendance,
        invite_code: inviteCode.trim(),
        invite_type: inviteType,
        guest_count: attendance === 'attending' ? guestCount : 0,
        plus_one_name: getFirstGuestName(additionalGuestNames),
        additional_guest_names: additionalGuestNames.trim(),
        dinner_attendance: inviteType === 'friday_saturday' ? dinnerAttendance : '',
        mass_attendance: attendance === 'attending' ? massAttendance : '',
        meal_preference: '',
        dietary_restrictions: dietary.trim(),
        accessibility_requirements: accessibility.trim(),
        transport_needed: false,
        message: message.trim(),
        custom_answers: {},
        source: 'guest',
      };

      const res = await fetch('/api/guests/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred while submitting.');
        setStep(attendance === 'attending' ? 'details' : 'declined');
        return;
      }

      trackEvent('rsvp_submitted', { status: attendance, invite_type: inviteType });
      setStep('confirmation');
    } catch {
      setError('A network error occurred. Please try again.');
      setStep(attendance === 'attending' ? 'details' : 'declined');
    }
  };

  const resetForm = () => {
    setStep('initial');
    setInviteCode('');
    setInviteType(null);
    setGuestName('');
    setEmail('');
    setAttendance(null);
    setGuestCount(1);
    setAdditionalGuestNames('');
    setDietary('');
    setAccessibility('');
    setDinnerAttendance('');
    setMassAttendance('');
    setMessage('');
    setError('');
    setHasSubmitted(false);
  };

  if (deadlinePassed && step !== 'confirmation') {
    return (
      <section id="rsvp" className={styles.rsvp} ref={ref as React.RefObject<HTMLElement>}>
        <div className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
          <div className={styles.fadeContainer}>
            <h2 className={styles.title}>RSVP Closed</h2>
            <p className={styles.subtitle}>The deadline to RSVP has passed. Please contact us directly if you have any questions.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className={styles.rsvp} ref={ref as React.RefObject<HTMLElement>}>
      <div className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
        {step === 'initial' && (
          <div className={styles.fadeContainer}>
            <p className={styles.eyebrow}>The favour of your reply is requested</p>
            <h2 className={styles.title}>Begin With Your Invite</h2>
            <p className={styles.subtitle}>Kindly respond by {deadlineDisplay}.</p>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <form className={styles.form} onSubmit={handleInitialSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="inviteCode" className={styles.label}>{labels.inviteCode}</label>
                <input
                  id="inviteCode"
                  type="text"
                  className={`${styles.input} ${fieldInvalid(resolveInviteType(inviteCode)) ? styles.invalid : ''}`}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter the code on your invitation"
                  autoCapitalize="characters"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="guestName" className={styles.label}>Full Name</label>
                <input
                  id="guestName"
                  type="text"
                  className={`${styles.input} ${fieldInvalid(guestName.trim()) ? styles.invalid : ''}`}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Jane Austen"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${fieldInvalid(email.trim()) ? styles.invalid : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                />
              </div>

              <div className={styles.attendanceButtons} aria-label="Attendance confirmation">
                <button
                  type="button"
                  className={`${styles.attendanceBtn} ${attendance === 'attending' ? styles.activeAttending : ''} ${fieldInvalid(attendance) ? styles.invalidChoice : ''}`}
                  onClick={() => setAttendance('attending')}
                >
                  Joyfully Accepts
                </button>
                <button
                  type="button"
                  className={`${styles.attendanceBtn} ${attendance === 'declined' ? styles.activeDeclined : ''} ${fieldInvalid(attendance) ? styles.invalidChoice : ''}`}
                  onClick={() => setAttendance('declined')}
                >
                  Regretfully Declines
                </button>
              </div>

              <button type="submit" className={styles.submitButton}>
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 'details' && inviteType && (
          <div className={styles.fadeContainer}>
            <p className={styles.eyebrow}>Invitation unlocked</p>
            <h2 className={styles.title}>We Saved Your Place</h2>
            <p className={styles.subtitle}>{INVITE_LABELS[inviteType]} invitation for {guestName}.</p>

            <div className={styles.inviteCard}>
              {inviteType === 'friday_saturday' ? 'Dinner reception and solemnisation Mass' : 'Solemnisation Mass'}
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <form className={styles.form} onSubmit={handleFinalSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="guestCount" className={styles.label}>{labels.guestCount}</label>
                <select
                  id="guestCount"
                  className={styles.select}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>

              {guestCount > 1 && (
                <div className={styles.field}>
                  <label htmlFor="additionalGuestNames" className={styles.label}>{labels.additionalGuests} *</label>
                  <textarea
                    id="additionalGuestNames"
                    className={`${styles.textarea} ${fieldInvalid(additionalGuestNames.trim()) ? styles.invalid : ''}`}
                    value={additionalGuestNames}
                    onChange={(e) => setAdditionalGuestNames(e.target.value)}
                    placeholder="List each guest name"
                    required
                  />
                </div>
              )}

              {inviteType === 'friday_saturday' && (
                <EventToggle
                  label={labels.dinner}
                  value={dinnerAttendance}
                  onChange={setDinnerAttendance}
                  invalid={fieldInvalid(dinnerAttendance)}
                />
              )}

              <EventToggle
                label={labels.mass}
                value={massAttendance}
                onChange={setMassAttendance}
                invalid={fieldInvalid(massAttendance)}
              />

              <div className={styles.field}>
                <label htmlFor="dietary" className={styles.label}>{labels.dietary}</label>
                <textarea
                  id="dietary"
                  className={styles.textarea}
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="Please write any dietary needs here"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="accessibility" className={styles.label}>{labels.accessibility}</label>
                <textarea
                  id="accessibility"
                  className={styles.textarea}
                  value={accessibility}
                  onChange={(e) => setAccessibility(e.target.value)}
                  placeholder="Let us know how we can support you"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="message" className={styles.label}>{labels.message}</label>
                <textarea
                  id="message"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className={styles.actionButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStep('initial')}>Back</button>
                <button type="submit" className={styles.submitButton}>Confirm RSVP</button>
              </div>
            </form>
          </div>
        )}

        {step === 'declined' && inviteType && (
          <div className={styles.fadeContainer}>
            <p className={styles.eyebrow}>Invitation unlocked</p>
            <h2 className={styles.title}>We'll Miss You</h2>
            <p className={styles.subtitle}>Thank you for letting us know. You may leave us a note below.</p>
            {error && <p className={styles.error} role="alert">{error}</p>}

            <form className={styles.form} onSubmit={handleFinalSubmit}>
              <div className={styles.inviteCard}>{INVITE_LABELS[inviteType]} invitation</div>

              <div className={styles.field}>
                <label htmlFor="declinedMessage" className={styles.label}>{labels.message}</label>
                <textarea
                  id="declinedMessage"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className={styles.actionButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStep('initial')}>Back</button>
                <button type="submit" className={styles.submitButton}>Confirm RSVP</button>
              </div>
            </form>
          </div>
        )}

        {step === 'submitting' && (
          <div className={styles.fadeContainer} style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p>Submitting your response...</p>
          </div>
        )}

        {step === 'confirmation' && (
          <div className={styles.confirmation}>
            <span className={styles.confFlourish} aria-hidden="true">
              {globalConfig?.MONOGRAM_IMAGE ? (
                <Image
                  src={globalConfig.MONOGRAM_IMAGE}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  className={styles.confMonogram}
                />
              ) : (
                <span className={styles.flowerMark} />
              )}
            </span>
            {attendance === 'declined' ? (
              <>
                <h2 className={styles.confTitle}>Thank You</h2>
                <p className={styles.confText}>We are so sorry you won't be able to join us, but we truly appreciate you letting us know.</p>
              </>
            ) : (
              <>
                <h2 className={styles.confTitle}>Thank You</h2>
                <p className={styles.confText}>{confirmationMessage}</p>
                <p className={styles.confEmail}>A confirmation has been sent to {email}.</p>
              </>
            )}

            <button className={styles.resetButton} onClick={resetForm}>
              Submit another RSVP
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function EventToggle({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: EventAnswer;
  onChange: (value: EventAnswer) => void;
  invalid: boolean;
}) {
  return (
    <fieldset className={`${styles.eventField} ${invalid ? styles.invalidChoice : ''}`}>
      <legend className={styles.label}>{label} *</legend>
      <div className={styles.eventToggle}>
        <button
          type="button"
          className={`${styles.eventButton} ${value === 'yes' ? styles.activeAttending : ''}`}
          onClick={() => onChange('yes')}
        >
          Yes
        </button>
        <button
          type="button"
          className={`${styles.eventButton} ${value === 'no' ? styles.activeDeclined : ''}`}
          onClick={() => onChange('no')}
        >
          No
        </button>
      </div>
    </fieldset>
  );
}
