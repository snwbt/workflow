'use client';

import { useState, useEffect, useRef } from 'react';

export function useReveal(options: IntersectionObserverInit = { threshold: 0.2 }) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // Only reveal once
      }
    }, options);

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, [options.threshold, options.root, options.rootMargin]);

  return { ref, isVisible };
}
