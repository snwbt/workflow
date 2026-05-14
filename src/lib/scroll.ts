'use client';

import type React from 'react';

export const MAIN_SCROLL_CONTAINER_ID = 'main-scroll-container';

function temporarilyDisableSnap(element: HTMLElement) {
  const previous = element.style.scrollSnapType;
  element.style.scrollSnapType = 'none';
  window.setTimeout(() => {
    element.style.scrollSnapType = previous;
  }, 700);
}

function getTargetTop(target: HTMLElement, scrollContainer: HTMLElement) {
  const containerRect = scrollContainer.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const scrollMarginTop = parseFloat(window.getComputedStyle(target).scrollMarginTop || '0') || 0;
  return targetRect.top - containerRect.top + scrollContainer.scrollTop - scrollMarginTop;
}

function getDocumentTargetTop(target: HTMLElement) {
  const scrollMarginTop = parseFloat(window.getComputedStyle(target).scrollMarginTop || '0') || 0;
  return target.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
}

export function scrollToPageSection(hashOrId: string) {
  const id = hashOrId.replace(/^#/, '');
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  const scrollContainer = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
  const scrollableContainer = scrollContainer
    && scrollContainer.contains(target)
    && scrollContainer.scrollHeight > scrollContainer.clientHeight + 1
    ? scrollContainer
    : null;

  if (scrollableContainer) {
    temporarilyDisableSnap(scrollableContainer);
    scrollableContainer.scrollTo({ top: getTargetTop(target, scrollableContainer), behavior: 'smooth' });
  } else {
    if (scrollContainer?.contains(target)) temporarilyDisableSnap(scrollContainer);
    window.scrollTo({ top: getDocumentTargetTop(target), behavior: 'smooth' });
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
