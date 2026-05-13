'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollProgress() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setProgress(1); // Set to max progress instantly
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) return;

    let rafId: number;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const rect = currentRef.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Element is below viewport
        if (rect.top > windowHeight) {
          setProgress(0);
          return;
        }
        
        // Element is above viewport
        if (rect.bottom < 0) {
          setProgress(1);
          return;
        }

        // Calculate progress as element moves from bottom of viewport to top
        const totalDistance = windowHeight + rect.height;
        const scrolledDistance = windowHeight - rect.top;
        const calculatedProgress = Math.max(0, Math.min(1, scrolledDistance / totalDistance));
        
        setProgress(calculatedProgress);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { ref, progress };
}
