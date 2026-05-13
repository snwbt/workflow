import { useEffect, useRef, useState } from 'react';

// Generic so callers can specify the exact element type (div, section, li, etc.)
export function useInView<T extends HTMLElement = HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let disconnected = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          disconnected = true;
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);

    // Safety net: if the observer hasn't fired within 1.5s (e.g. slow hydration,
    // element already in viewport before observer attached), force reveal.
    const timer = setTimeout(() => {
      if (!disconnected) {
        setInView(true);
        observer.disconnect();
      }
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [threshold]);

  return { ref, inView };
}
