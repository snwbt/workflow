'use client';

import { useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import { useSiteText } from '@/lib/sitePreferences';
import SectionWallpaper from '@/components/SectionWallpaper';
import styles from './FaqSection.module.css';

interface FaqItem {
  question: string;
  answer: string;
  enabled?: boolean;
}

const defaultFaqs: FaqItem[] = [
  { question: 'What is the dress code?', answer: 'Smart formal attire is requested for the dinner reception.', enabled: true },
  { question: 'Are children invited?', answer: 'Please refer to your invitation for the guests included in your party.', enabled: true },
  { question: 'What time should I arrive?', answer: 'We kindly ask that guests arrive early enough to be seated before the celebration begins.', enabled: true },
  { question: 'Where should I park?', answer: 'Parking details will be shared closer to the date.', enabled: true },
];

export default function FaqSection({ config }: { config?: any }) {
  const { ref, isVisible } = useReveal({ threshold: 0.1 });
  const { t } = useSiteText();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const heading = config?.heading || 'What to Know';
  const allFaqs: FaqItem[] = config?.faqs?.length > 0 ? config.faqs : defaultFaqs;
  const faqs = allFaqs.filter((f) => f.enabled !== false);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className={styles.faq} ref={ref as React.RefObject<HTMLElement>}>
      <SectionWallpaper src={config?.wallpaperUrl} alt={config?.wallpaperAlt || ''} tone="light" />
      <div className={styles.content}>
        <h2 className={`${styles.title} revealFadeUp ${isVisible ? 'revealFadeUpVisible' : ''}`}>{t(heading)}</h2>

        {faqs.length === 0 && (
          <p className={styles.empty}>
            {t('Check back soon for frequently asked questions.')}
          </p>
        )}

        <div className={styles.accordion}>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`${styles.item} revealFadeUp ${isVisible ? 'revealFadeUpVisible' : ''}`}
                style={{ transitionDelay: `${Math.min(index, 6) * 45}ms` }}
              >
                <button
                  className={styles.question}
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span>{t(faq.question)}</span>
                  <span className={`${styles.icon} ${isOpen ? styles.open : ''}`} aria-hidden="true">+</span>
                </button>
                <div className={`${styles.answerWrapper} ${isOpen ? styles.open : ''}`}>
                  <div className={styles.answer}>
                    <p>{t(faq.answer)}</p>
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
