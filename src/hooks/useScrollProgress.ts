'use client';

import { useState, useEffect, useRef } from 'react';
import { MAIN_SCROLL_CONTAINER_ID } from '@/lib/scroll';

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

    const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
    let rafId: number;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const rect = currentRef.getBoundingClientRect();
        const rootRect = scrollContainer?.getBoundingClientRect();
        const viewportTop = rootRect?.top || 0;
        const viewportHeight = rootRect?.height || window.innerHeight;
        const relativeTop = rect.top - viewportTop;
        
        // Element is below viewport
        if (relativeTop > viewportHeight) {
          setProgress(0);
          return;
        }
        
        // Element is above viewport
        if (rect.bottom < 0) {
          setProgress(1);
          return;
        }

        // Calculate progress as element moves from bottom of viewport to top
        const totalDistance = viewportHeight + rect.height;
        const scrolledDistance = viewportHeight - relativeTop;
        const calculatedProgress = Math.max(0, Math.min(1, scrolledDistance / totalDistance));
        
        setProgress(calculatedProgress);
      });
    };

    const scrollTarget = scrollContainer || window;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { ref, progress };
}
