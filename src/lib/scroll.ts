'use client';

import type React from 'react';

export const MAIN_SCROLL_CONTAINER_ID = 'main-scroll-container';

export function scrollToPageSection(hashOrId: string) {
  const id = hashOrId.replace(/^#/, '');
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);

  if (scrollContainer && scrollContainer.contains(target)) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = targetRect.top - containerRect.top + scrollContainer.scrollTop;

    scrollContainer.scrollTo({ top, behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, '', `#${id}`);
  }

  return true;
}

export function handleSectionLinkClick(
  event: React.MouseEvent<HTMLElement>,
  href: string
) {
  if (!href.startsWith('#')) return;

  if (scrollToPageSection(href)) {
    event.preventDefault();
  }
}
