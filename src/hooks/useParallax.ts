'use client';

import { useState, useEffect } from 'react';
import { MAIN_SCROLL_CONTAINER_ID } from '@/lib/scroll';

export function useParallax(speed = 0.3) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
    let rafId: number;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setOffset((scrollContainer?.scrollTop || window.scrollY) * speed);
      });
    };

    const scrollTarget = scrollContainer || window;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call
    handleScroll();

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [speed]);

  return offset;
}
