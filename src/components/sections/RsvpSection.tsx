'use client';

import { useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import styles from './RsvpSection.module.css';
import { trackEvent } from '@/lib/analytics';
import { getRsvpDeadlineDisplay } from '@/lib/eventDisplay';

export default function RsvpSection({ globalConfig }: { globalConfig?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.18 });
  const [step, setStep] = useState<'initial' | 'attending_details' | 'declined_details' | 'submitting' | 'confirmation'>('initial');
  
  // Form state
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [attendance, setAttendance] = useState<'attending' | 'declined' | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [plusOneName, setPlusOneName] = useState('');
  const [mealPref, setMealPref] = useState('');
  const [dietary, setDietary] = useState('');
  const [transport, setTransport] = useState(false);
  const [message, setMessage] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  
  const [error, setError] = useState('');

  const deadlinePassed = globalConfig?.RSVP_DEADLINE && new Date(globalConfig.RSVP_DEADLINE) < new Date();

  const deadlineDisplay = getRsvpDeadlineDisplay(globalConfig);
  
  // Read configured fields or fallback to defaults
  const rsvpFields = globalConfig?.RSVP_FIELDS || {
    guest_count: { enabled: true, label: "How many guests in your party?", required: true },
    plus_one_name: { enabled: true, label: "Name of your guest", required: true },
    meal_preference: { enabled: true, label: "Meal Preference", required: true, options: [{ value: "beef", label: "Filet Mignon" }, { value: "fish", label: "Seared Halibut" }, { value: "vegetarian", label: "Roasted Cauliflower Steak" }] },
    dietary_restrictions: { enabled: true, label: "Dietary Restrictions", required: false },
    transport: { enabled: true, label: "I will need shuttle transport from the hotel to the venue.", required: false },
    message: { enabled: true, label: "Note to the Couple (Optional)", required: false }
  };
  
  const customQuestions = globalConfig?.RSVP_CUSTOM_QUESTIONS || [];

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !email.trim()) {
      setError('Please provide your name and email.');
      return;
    }
    if (!attendance) {
      setError('Please let us know if you can make it.');
      return;
    }
    setError('');
    
    if (attendance === 'attending') setStep('attending_details');
    else setStep('declined_details');
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('submitting');

    try {
      const payload = {
        guest_name: guestName,
        email,
        attendance_status: attendance,
        guest_count: attendance === 'attending' && rsvpFields.guest_count?.enabled ? guestCount : 0,
        plus_one_name: rsvpFields.plus_one_name?.enabled ? plusOneName : '',
        meal_preference: rsvpFields.meal_preference?.enabled ? mealPref : '',
        dietary_restrictions: rsvpFields.dietary_restrictions?.enabled ? dietary : '',
        transport_needed: rsvpFields.transport?.enabled ? transport : false,
        message: rsvpFields.message?.enabled ? message : '',
        custom_answers: customAnswers,
        source: 'guest'
      };

      const res = await fetch('/api/guests/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred while submitting.');
        setStep(attendance === 'attending' ? 'attending_details' : 'declined_details');
        return;
      }

      trackEvent('rsvp_submitted', { status: attendance });
      setStep('confirmation');
    } catch (err) {
      setError('A network error occurred. Please try again.');
      setStep(attendance === 'attending' ? 'attending_details' : 'declined_details');
    }
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
            <h2 className={styles.title}>Will you be joining us?</h2>
            <p className={styles.subtitle}>Kindly respond by {deadlineDisplay}.</p>
            
            {error && <p className={styles.error} role="alert">{error}</p>}

            <form className={styles.form} onSubmit={handleInitialSubmit}>
              <div className={styles.field}>
                <label htmlFor="guestName" className={styles.label}>Full Name</label>
                <input
                  id="guestName"
                  type="text"
                  className={styles.input}
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
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                />
              </div>

              <div className={styles.attendanceButtons}>
                <button
                  type="button"
                  className={`${styles.attendanceBtn} ${attendance === 'attending' ? styles.activeAttending : ''}`}
                  onClick={() => setAttendance('attending')}
                >
                  Joyfully Accepts
                </button>
                <button
                  type="button"
                  className={`${styles.attendanceBtn} ${attendance === 'declined' ? styles.activeDeclined : ''}`}
                  onClick={() => setAttendance('declined')}
                >
                  Regretfully Declines
                </button>
              </div>

              <button type="submit" className={styles.submitButton} disabled={!attendance}>
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 'attending_details' && (
          <div className={styles.fadeContainer}>
            <h2 className={styles.title}>Wonderful!</h2>
            <p className={styles.subtitle}>We can't wait to see you. Please provide a few more details.</p>
            {error && <p className={styles.error} role="alert">{error}</p>}

            <form className={styles.form} onSubmit={handleFinalSubmit}>
              
              {rsvpFields.guest_count?.enabled && (
                <div className={styles.field}>
                  <label htmlFor="guestCount" className={styles.label}>
                    {rsvpFields.guest_count.label}
                    {rsvpFields.guest_count.required && ' *'}
                  </label>
                  <select 
                    id="guestCount" 
                    className={styles.select} 
                    value={guestCount} 
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    required={rsvpFields.guest_count.required}
                  >
                    <option value={1}>Just me (1)</option>
                    <option value={2}>Me + Guest (2)</option>
                  </select>
                </div>
              )}

              {rsvpFields.plus_one_name?.enabled && guestCount > 1 && (
                <div className={styles.field}>
                  <label htmlFor="plusOneName" className={styles.label}>
                    {rsvpFields.plus_one_name.label}
                    {rsvpFields.plus_one_name.required && ' *'}
                  </label>
                  <input
                    id="plusOneName"
                    type="text"
                    className={styles.input}
                    value={plusOneName}
                    onChange={(e) => setPlusOneName(e.target.value)}
                    required={rsvpFields.plus_one_name.required}
                  />
                </div>
              )}

              {rsvpFields.meal_preference?.enabled && (
                <div className={styles.field}>
                  <label htmlFor="mealPref" className={styles.label}>
                    {rsvpFields.meal_preference.label}
                    {rsvpFields.meal_preference.required && ' *'}
                  </label>
                  <select
                    id="mealPref"
                    className={styles.select}
                    value={mealPref}
                    onChange={(e) => setMealPref(e.target.value)}
                    required={rsvpFields.meal_preference.required}
                  >
                    <option value="" disabled>Select a meal...</option>
                    {rsvpFields.meal_preference.options?.map((opt: any, i: number) => (
                      <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {rsvpFields.dietary_restrictions?.enabled && (
                <div className={styles.field}>
                  <label htmlFor="dietary" className={styles.label}>
                    {rsvpFields.dietary_restrictions.label}
                    {rsvpFields.dietary_restrictions.required && ' *'}
                  </label>
                  <input
                    id="dietary"
                    type="text"
                    className={styles.input}
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    placeholder="e.g., Nut allergy, Gluten-free"
                    required={rsvpFields.dietary_restrictions.required}
                  />
                </div>
              )}

              {rsvpFields.transport?.enabled && (
                <div className={styles.field} style={{flexDirection: 'row', alignItems: 'center', gap: '0.5rem'}}>
                  <input
                    id="transport"
                    type="checkbox"
                    checked={transport}
                    onChange={(e) => setTransport(e.target.checked)}
                    required={rsvpFields.transport.required}
                  />
                  <label htmlFor="transport" className={styles.label} style={{margin: 0, textTransform: 'none', letterSpacing: 'normal'}}>
                    {rsvpFields.transport.label}
                    {rsvpFields.transport.required && ' *'}
                  </label>
                </div>
              )}

              {customQuestions.map((q: any, i: number) => (
                <div key={i} className={styles.field} style={{marginTop: '0.5rem'}}>
                  <label htmlFor={`custom-${i}`} className={styles.label}>
                    {q.label}
                    {q.required && ' *'}
                  </label>
                  {q.type === 'dropdown' ? (
                    <select
                      id={`custom-${i}`}
                      className={styles.select}
                      value={customAnswers[q.label] || ''}
                      onChange={(e) => setCustomAnswers({...customAnswers, [q.label]: e.target.value})}
                      required={q.required}
                    >
                      <option value="" disabled>Select an option...</option>
                      {q.options?.map((opt: string, j: number) => (
                        <option key={j} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`custom-${i}`}
                      type="text"
                      className={styles.input}
                      value={customAnswers[q.label] || ''}
                      onChange={(e) => setCustomAnswers({...customAnswers, [q.label]: e.target.value})}
                      required={q.required}
                    />
                  )}
                </div>
              ))}

              {rsvpFields.message?.enabled && (
                <div className={styles.field} style={{marginTop: '1.5rem'}}>
                  <label htmlFor="message" className={styles.label}>
                    {rsvpFields.message.label}
                    {rsvpFields.message.required && ' *'}
                  </label>
                  <textarea
                    id="message"
                    className={styles.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required={rsvpFields.message.required}
                  />
                </div>
              )}

              <div className={styles.actionButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStep('initial')}>Back</button>
                <button type="submit" className={styles.submitButton}>Confirm RSVP</button>
              </div>
            </form>
          </div>
        )}

        {step === 'declined_details' && (
          <div className={styles.fadeContainer}>
            <h2 className={styles.title}>We'll miss you!</h2>
            <p className={styles.subtitle}>If you'd like to leave a note, you can do so below.</p>
            {error && <p className={styles.error} role="alert">{error}</p>}

            <form className={styles.form} onSubmit={handleFinalSubmit}>
              {rsvpFields.message?.enabled && (
                <div className={styles.field}>
                  <label htmlFor="messageDeclined" className={styles.label}>
                    {rsvpFields.message.label}
                    {rsvpFields.message.required && ' *'}
                  </label>
                  <textarea
                    id="messageDeclined"
                    className={styles.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required={rsvpFields.message.required}
                  />
                </div>
              )}

              <div className={styles.actionButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStep('initial')}>Back</button>
                <button type="submit" className={styles.submitButton}>Confirm RSVP</button>
              </div>
            </form>
          </div>
        )}

        {step === 'submitting' && (
          <div className={styles.fadeContainer} style={{textAlign: 'center', padding: '4rem 0'}}>
            <p>Submitting your response...</p>
          </div>
        )}

        {step === 'confirmation' && (
          <div className={styles.confirmation}>
            {attendance === 'declined' ? (
              <>
                <h2 className={styles.confTitle}>Thank You</h2>
                <p className={styles.confText}>We are so sorry you won't be able to join us, but we truly appreciate you letting us know.</p>
              </>
            ) : (
              <>
                <h2 className={styles.confTitle}>You're on the list.</h2>
                <p className={styles.confText}>Thank you for your RSVP. We are so excited to celebrate with you!</p>
                <p style={{marginTop: '1rem', color: 'var(--color-text-secondary)'}}>A confirmation has been sent to {email}.</p>
              </>
            )}
            
            <button 
              className={styles.secondaryButton} 
              style={{marginTop: '2rem', border: 'none', borderBottom: '1px solid var(--color-espresso)', padding: 0, borderRadius: 0}}
              onClick={() => {
                setStep('initial');
                setGuestName('');
                setEmail('');
                setAttendance(null);
                setPlusOneName('');
                setMessage('');
                setCustomAnswers({});
              }}
            >
              Submit another RSVP
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
