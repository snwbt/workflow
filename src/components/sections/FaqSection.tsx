'use client';

import { useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import styles from './FaqSection.module.css';

interface FaqItem {
  question: string;
  answer: string;
  enabled?: boolean;
}

interface DetailCard {
  icon: string;
  label: string;
  value: string;
}

// These defaults only show if the CMS hasn't configured any faqs
const defaultFaqs: FaqItem[] = [
  { question: 'What is the dress code?', answer: 'Smart formal attire is requested for the dinner reception. We suggest dark suits or barong for men, and formal evening wear or elegant cocktail dresses for women.', enabled: true },
  { question: 'Are children invited?', answer: 'We love your little ones, but we have chosen to make the dinner reception an adults-only celebration. We hope this allows you to relax and enjoy the evening.', enabled: true },
  { question: 'What time should I arrive?', answer: 'We kindly ask that guests arrive by 6:30 in the evening. Please proceed to the Grand Ballroom on Level 3.', enabled: true },
  { question: 'Where should I park?', answer: 'Self-parking is available at Asia Square Tower 2 basement. Valet parking is also available at the main hotel entrance.', enabled: true },
  { question: 'Who should I contact on the day?', answer: 'For any questions on the day, please reach out to our wedding concierge via WhatsApp.', enabled: true },
  { question: 'Is there wheelchair access?', answer: 'Yes. Wheelchair accessible entrances are available on Level 1. Please contact our concierge team at least 48 hours in advance to arrange assistance.', enabled: true },
];

const detailCards: DetailCard[] = [
  { icon: '✦', label: 'Dress Code', value: 'Smart Formal' },
  { icon: '◇', label: 'Gifts',      value: 'Your presence is the greatest gift' },
  { icon: '⌘', label: 'Arrival',   value: 'Please arrive by 6:30 PM' },
  { icon: '◈', label: 'Contact',   value: 'Message the wedding concierge' },
];

export default function FaqSection({ config }: { config?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.1 });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const heading = config?.heading || 'What to Know';

  // Use CMS faqs filtered to enabled; fall back to defaults if none configured
  const allFaqs: FaqItem[] = config?.faqs?.length > 0 ? config.faqs : defaultFaqs;
  const faqs = allFaqs.filter((f) => f.enabled !== false);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className={styles.faq} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.content}>
        <h2 className={`${styles.title} revealFadeUp ${isVisible ? 'revealFadeUpVisible' : ''}`}>{heading}</h2>

        {/* Detail summary cards */}
        <div className={styles.detailCards}>
          {detailCards.map((card, i) => (
            <div
              key={i}
              className={`${styles.detailCard} revealFadeUp ${isVisible ? 'revealFadeUpVisible' : ''}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <span className={styles.detailIcon} aria-hidden="true">{card.icon}</span>
              <span className={styles.detailLabel}>{card.label}</span>
              <span className={styles.detailValue}>{card.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {faqs.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Check back soon for frequently asked questions.
          </p>
        )}

        <div className={styles.accordion}>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`${styles.item} revealFadeUp ${isVisible ? 'revealFadeUpVisible' : ''}`}
                style={{ transitionDelay: `${220 + index * 55}ms` }}
              >
                <button
                  className={styles.question}
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span className={`${styles.icon} ${isOpen ? styles.open : ''}`} aria-hidden="true">+</span>
                </button>
                <div className={`${styles.answerWrapper} ${isOpen ? styles.open : ''}`}>
                  <div className={styles.answer}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
