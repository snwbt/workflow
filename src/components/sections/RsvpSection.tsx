'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import styles from './RsvpSection.module.css';
import { trackEvent } from '@/lib/analytics';
import { getRsvpDeadlineDisplay } from '@/lib/eventDisplay';
import { useSiteText } from '@/lib/sitePreferences';
import { getCalendarEvents, getCalendarLinks, type CalendarEvent } from '@/lib/calendar';
import { MAIN_SCROLL_CONTAINER_ID } from '@/lib/scroll';
import SectionWallpaper from '@/components/SectionWallpaper';

type AttendanceStatus = 'attending' | 'declined';
type InviteType = 'friday_saturday' | 'saturday_only';
type RsvpStep = 'initial' | 'details' | 'declined' | 'submitting' | 'confirmation';
type EventAnswer = 'yes' | 'no' | '';
type DietaryChoice = 'none' | 'halal' | 'vegetarian' | 'other';

interface DietaryEntry {
  choice: DietaryChoice;
  notes: string;
}

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function dietaryLabel(value: DietaryChoice) {
  if (value === 'halal') return 'Halal';
  if (value === 'vegetarian') return 'Vegetarian';
  if (value === 'other') return 'Other';
  return 'No restriction';
}

export default function RsvpSection({ globalConfig, scheduleConfig }: { globalConfig?: any; scheduleConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.18 });
  const { t } = useSiteText();
  const [step, setStep] = useState<RsvpStep>('initial');

  const [inviteCode, setInviteCode] = useState('');
  const [inviteType, setInviteType] = useState<InviteType | null>(null);
  const [prefillInvite, setPrefillInvite] = useState<{ code: string; type: InviteType } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [companionNames, setCompanionNames] = useState<string[]>([]);
  const [dietaryByGuest, setDietaryByGuest] = useState<Record<string, DietaryEntry>>({});
  const [accessibility, setAccessibility] = useState('');
  const [dinnerAttendance, setDinnerAttendance] = useState<EventAnswer>('');
  const [massAttendance, setMassAttendance] = useState<EventAnswer>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const fridaySaturdayCode = String(globalConfig?.RSVP_INVITE_CODE_FRIDAY_SATURDAY || 'FRISAT');
  const saturdayOnlyCode = String(globalConfig?.RSVP_INVITE_CODE_SATURDAY || 'SATURDAY');
  const confirmationMessage = globalConfig?.RSVP_CONFIRMATION_MESSAGE || "Thank you! We'll see you in October.";
  const initialHeading = globalConfig?.RSVP_INITIAL_HEADING || 'Begin With Your Invitation';
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
    if (prefillInvite && normalized === normalizeCode(prefillInvite.code)) return prefillInvite.type;
    if (normalized && normalized === normalizeCode(fridaySaturdayCode)) return 'friday_saturday';
    if (normalized && normalized === normalizeCode(saturdayOnlyCode)) return 'saturday_only';
    return null;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite') || params.get('code');
    if (!code) return;

    if (window.location.hash === '#rsvp-form' || window.location.hash === '#rsvp') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      window.requestAnimationFrame(() => {
        const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
        scrollContainer?.scrollTo({ top: 0, behavior: 'auto' });
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    }

    setInviteCode(code);

    fetch(`/api/guests/invitation?code=${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.guestName) setGuestName(data.guestName);
        if (data.email) setEmail(data.email);
        if (data.inviteCode && data.inviteType) {
          setInviteCode(data.inviteCode);
          setPrefillInvite({ code: data.inviteCode, type: data.inviteType });
        }
      })
      .catch(() => {
        setPrefillInvite(null);
      });
  }, []);

  const fieldInvalid = (value: unknown) => hasSubmitted && !value;
  const additionalNamesRequired = attendance === 'attending' && guestCount > 1;
  const requiredCompanionCount = Math.max(0, guestCount - 1);
  const companionValues = companionNames.slice(0, requiredCompanionCount);
  const additionalGuestNames = companionValues.map((name) => name.trim()).filter(Boolean).join('\n');
  const attendingGuests = [
    { id: 'primary', name: guestName.trim() || 'You' },
    ...Array.from({ length: requiredCompanionCount }, (_, index) => ({
      id: `companion-${index}`,
      name: companionValues[index]?.trim() || `Guest ${index + 2}`,
    })),
  ];

  const updateDietaryEntry = (id: string, updates: Partial<DietaryEntry>) => {
    setDietaryByGuest((current) => {
      const existing = current[id] || { choice: 'none' as DietaryChoice, notes: '' };
      const next = { ...existing, ...updates };
      if (updates.choice && updates.choice !== 'other') next.notes = '';
      return { ...current, [id]: next };
    });
  };

  const perGuestDietary = attendingGuests.map((guest) => {
    const entry = dietaryByGuest[guest.id] || { choice: 'none' as DietaryChoice, notes: '' };
    return {
      name: guest.name,
      dietary: dietaryLabel(entry.choice),
      notes: entry.choice === 'other' ? entry.notes.trim() : '',
    };
  });

  const dietarySummary = perGuestDietary
    .map((entry) => `${entry.name}: ${entry.dietary}${entry.notes ? ` - ${entry.notes}` : ''}`)
    .join('\n');

  const updateGuestCount = (count: number) => {
    const nextCount = Math.max(1, Math.min(4, count));
    setGuestCount(nextCount);
    setCompanionNames((current) => (
      Array.from({ length: Math.max(0, nextCount - 1) }, (_, index) => current[index] || '')
    ));
  };

  const updateCompanionName = (index: number, value: string) => {
    setCompanionNames((current) => {
      const next = Array.from({ length: requiredCompanionCount }, (_, itemIndex) => current[itemIndex] || '');
      next[index] = value;
      return next;
    });
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    let resolvedType = resolveInviteType(inviteCode);
    let nextGuestName = guestName;
    let nextEmail = email;

    if (!resolvedType && inviteCode.trim()) {
      try {
        const res = await fetch(`/api/guests/invitation?code=${encodeURIComponent(inviteCode.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.inviteCode && data.inviteType) {
            setPrefillInvite({ code: data.inviteCode, type: data.inviteType });
            if (!guestName.trim() && data.guestName) {
              nextGuestName = data.guestName;
              setGuestName(data.guestName);
            }
            if (!email.trim() && data.email) {
              nextEmail = data.email;
              setEmail(data.email);
            }
            resolvedType = data.inviteType;
          }
        }
      } catch {
        resolvedType = null;
      }
    }

    if (!resolvedType) {
      setError('Please enter a valid invite code.');
      return;
    }

    if (!nextGuestName.trim() || !nextEmail.trim()) {
      setError('Please provide your name and email.');
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setError('Please enter a valid email address.');
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

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 4) {
      setError('Please select between 1 and 4 guests attending.');
      return false;
    }

    if (
      additionalNamesRequired &&
      (companionValues.length < requiredCompanionCount || companionValues.some((name) => !name.trim()))
    ) {
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
        dietary_restrictions: dietarySummary,
        accessibility_requirements: accessibility.trim(),
        transport_needed: false,
        message: message.trim(),
        custom_answers: { per_guest_dietary: perGuestDietary },
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
    setCompanionNames([]);
    setDietaryByGuest({});
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
        <SectionWallpaper src={globalConfig?.RSVP_WALLPAPER} alt={globalConfig?.RSVP_WALLPAPER_ALT || ''} tone="paper" />
        <div className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
          <div className={styles.fadeContainer}>
            <h2 className={styles.title}>{t('RSVP Closed')}</h2>
            <p className={styles.subtitle}>{t('The deadline to RSVP has passed. Please contact us directly if you have any questions.')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className={styles.rsvp} ref={ref as React.RefObject<HTMLElement>}>
      <SectionWallpaper src={globalConfig?.RSVP_WALLPAPER} alt={globalConfig?.RSVP_WALLPAPER_ALT || ''} tone="paper" />
      <div id="rsvp-form" className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
        {step === 'initial' && (
          <div className={styles.fadeContainer}>
            <p className={styles.eyebrow}>{t('The favour of your reply is requested')}</p>
            <h2 className={styles.title}>{t(initialHeading)}</h2>
            <p className={styles.subtitle}>{t('Kindly respond by {date}.', { date: deadlineDisplay })}</p>

            {error && <p className={styles.error} role="alert">{t(error)}</p>}

            <form className={styles.form} onSubmit={handleInitialSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="inviteCode" className={styles.label}>{t(labels.inviteCode)}</label>
                <input
                  id="inviteCode"
                  type="text"
                  className={`${styles.input} ${fieldInvalid(resolveInviteType(inviteCode)) ? styles.invalid : ''}`}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder={t('Enter the code on your invitation')}
                  autoCapitalize="characters"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="guestName" className={styles.label}>{t('Full Name')}</label>
                <input
                  id="guestName"
                  type="text"
                  className={`${styles.input} ${fieldInvalid(guestName.trim()) ? styles.invalid : ''}`}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t('Jane Austen')}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>{t('Email Address')}</label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${hasSubmitted && !isValidEmail(email) ? styles.invalid : ''}`}
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
                  aria-pressed={attendance === 'attending'}
                >
                  {t('Joyfully Accepts')}
                </button>
                <button
                  type="button"
                  className={`${styles.attendanceBtn} ${attendance === 'declined' ? styles.activeDeclined : ''} ${fieldInvalid(attendance) ? styles.invalidChoice : ''}`}
                  onClick={() => setAttendance('declined')}
                  aria-pressed={attendance === 'declined'}
                >
                  {t('Regretfully Declines')}
                </button>
              </div>

              <button type="submit" className={styles.submitButton}>
                {t('Continue')}
              </button>
            </form>
          </div>
        )}

        {step === 'details' && inviteType && (
          <div className={styles.fadeContainer}>
            <p className={styles.eyebrow}>{t('Invitation unlocked')}</p>
            <h2 className={styles.title}>{t('We Saved Your Place')}</h2>
            <p className={styles.subtitle}>{t('{label} invitation for {name}.', { label: t(INVITE_LABELS[inviteType]), name: guestName })}</p>

            <div className={styles.inviteCard}>
              {inviteType === 'friday_saturday' ? t('Dinner reception and solemnisation Mass') : t('Solemnisation Mass')}
            </div>

            {error && <p className={styles.error} role="alert">{t(error)}</p>}

            <form className={styles.form} onSubmit={handleFinalSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="guestCount" className={styles.label}>{t(labels.guestCount)}</label>
                <select
                  id="guestCount"
                  className={styles.select}
                  value={guestCount}
                  onChange={(e) => updateGuestCount(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>

              {guestCount > 1 && (
                <fieldset className={styles.companionField}>
                  <legend className={styles.label}>{t(labels.additionalGuests)} *</legend>
                  <div className={styles.companionGrid}>
                    {Array.from({ length: requiredCompanionCount }, (_, index) => (
                      <label key={index} className={styles.companionLabel}>
                        {t('Guest {number} name', { number: index + 2 })}
                        <input
                          type="text"
                          className={`${styles.input} ${hasSubmitted && !companionValues[index]?.trim() ? styles.invalid : ''}`}
                          value={companionValues[index] || ''}
                          onChange={(e) => updateCompanionName(index, e.target.value)}
                          placeholder={t('Guest {number} name', { number: index + 2 })}
                          required
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
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

              <DietaryMatrix
                label={labels.dietary}
                guests={attendingGuests}
                values={dietaryByGuest}
                onChange={updateDietaryEntry}
              />

              <div className={styles.field}>
                <label htmlFor="accessibility" className={styles.label}>{t(labels.accessibility)}</label>
                <textarea
                  id="accessibility"
                  className={styles.textarea}
                  value={accessibility}
                  onChange={(e) => setAccessibility(e.target.value)}
                  placeholder={t('Let us know how we can support you')}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="message" className={styles.label}>{t(labels.message)}</label>
                <textarea
                  id="message"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className={styles.actionButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStep('initial')}>{t('Back')}</button>
                <button type="submit" className={styles.submitButton}>{t('Confirm RSVP')}</button>
              </div>
            </form>
          </div>
        )}

        {step === 'declined' && inviteType && (
          <div className={styles.fadeContainer}>
            <p className={styles.eyebrow}>{t('Invitation unlocked')}</p>
            <h2 className={styles.title}>{t("We'll Miss You")}</h2>
            <p className={styles.subtitle}>{t('Thank you for letting us know. You may leave us a note below.')}</p>
            {error && <p className={styles.error} role="alert">{t(error)}</p>}

            <form className={styles.form} onSubmit={handleFinalSubmit}>
              <div className={styles.inviteCard}>{t('{label} invitation', { label: t(INVITE_LABELS[inviteType]) })}</div>

              <div className={styles.field}>
                <label htmlFor="declinedMessage" className={styles.label}>{t(labels.message)}</label>
                <textarea
                  id="declinedMessage"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className={styles.actionButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStep('initial')}>{t('Back')}</button>
                <button type="submit" className={styles.submitButton}>{t('Confirm RSVP')}</button>
              </div>
            </form>
          </div>
        )}

        {step === 'submitting' && (
          <div className={styles.fadeContainer} style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p>{t('Submitting your response...')}</p>
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
                <h2 className={styles.confTitle}>{t('Thank You')}</h2>
                <p className={styles.confText}>{t("We are so sorry you won't be able to join us, but we truly appreciate you letting us know.")}</p>
              </>
            ) : (
              <>
                <h2 className={styles.confTitle}>{t('Thank You')}</h2>
                <p className={styles.confText}>{t(confirmationMessage)}</p>
                <p className={styles.confEmail}>{t('A confirmation has been sent to {email}.', { email })}</p>
                <CalendarActions events={getCalendarEvents(inviteType, scheduleConfig, globalConfig || {})} />
              </>
            )}

            <button className={styles.resetButton} onClick={resetForm}>
              {t('Submit another RSVP')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CalendarActions({ events }: { events: CalendarEvent[] }) {
  const { t } = useSiteText();
  if (!events.length) return null;

  return (
    <div className={styles.calendarPanel}>
      <h3>{t('Add to Calendar')}</h3>
      {events.map((event) => {
        const links = getCalendarLinks(event);
        return (
          <div key={event.id} className={styles.calendarEvent}>
            <div>
              <p>{t(event.title)}</p>
              <span>{event.start.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })} | {event.location}</span>
            </div>
            <div className={styles.calendarButtons}>
              <a href={links.google} target="_blank" rel="noopener noreferrer" className={styles.calendarButton}>
                <span className={styles.googleMark}>G</span>
                {t('Add to Google Calendar')}
              </a>
              <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={styles.calendarButton}>
                <span className={styles.outlookMark}>O</span>
                {t('Add to Outlook Calendar')}
              </a>
              <a href={links.ics} download={`${event.id}-wedding.ics`} className={styles.calendarButton}>
                <span className={styles.appleMark}>ICS</span>
                {t('Add to Apple Calendar / download .ics')}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DietaryMatrix({
  label,
  guests,
  values,
  onChange,
}: {
  label: string;
  guests: { id: string; name: string }[];
  values: Record<string, DietaryEntry>;
  onChange: (id: string, updates: Partial<DietaryEntry>) => void;
}) {
  const { t } = useSiteText();

  return (
    <fieldset className={styles.dietaryMatrix}>
      <legend className={styles.label}>{t(label)}</legend>
      <div className={styles.dietaryRows}>
        {guests.map((guest) => {
          const entry = values[guest.id] || { choice: 'none' as DietaryChoice, notes: '' };
          return (
            <div key={guest.id} className={styles.dietaryRow}>
              <span>{guest.name}</span>
              <select
                className={styles.select}
                value={entry.choice}
                onChange={(event) => onChange(guest.id, { choice: event.target.value as DietaryChoice })}
              >
                <option value="none">{t('No restriction')}</option>
                <option value="halal">{t('Halal')}</option>
                <option value="vegetarian">{t('Vegetarian')}</option>
                <option value="other">{t('Other')}</option>
              </select>
              {entry.choice === 'other' && (
                <input
                  type="text"
                  className={styles.input}
                  value={entry.notes}
                  onChange={(event) => onChange(guest.id, { notes: event.target.value })}
                  placeholder={t('Please write any dietary needs here')}
                />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
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
  const { t } = useSiteText();

  return (
    <fieldset className={`${styles.eventField} ${invalid ? styles.invalidChoice : ''}`}>
      <legend className={styles.label}>{t(label)} *</legend>
      <div className={styles.eventToggle}>
        <button
          type="button"
          className={`${styles.eventButton} ${value === 'yes' ? styles.activeYes : ''}`}
          onClick={() => onChange('yes')}
          aria-pressed={value === 'yes'}
        >
          {t('Yes')}
        </button>
        <button
          type="button"
          className={`${styles.eventButton} ${value === 'no' ? styles.activeNo : ''}`}
          onClick={() => onChange('no')}
          aria-pressed={value === 'no'}
        >
          {t('No')}
        </button>
      </div>
    </fieldset>
  );
}
