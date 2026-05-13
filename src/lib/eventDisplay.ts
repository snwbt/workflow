const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatEventDate(value?: string, fallback = 'a date to be confirmed') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return dateFormatter.format(date);
}

export function getRsvpDeadlineDisplay(config?: Record<string, unknown>, fallback = 'a date to be confirmed') {
  if (typeof config?.RSVP_DEADLINE_DISPLAY === 'string' && config.RSVP_DEADLINE_DISPLAY) {
    return config.RSVP_DEADLINE_DISPLAY;
  }
  return formatEventDate(typeof config?.RSVP_DEADLINE === 'string' ? config.RSVP_DEADLINE : undefined, fallback);
}

export function getRsvpReminderText(config?: Record<string, unknown>) {
  const deadline = getRsvpDeadlineDisplay(config, '');
  return deadline ? `RSVP by ${deadline}` : '';
}

export function toDateInputValue(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

export function fromDateInputValue(value: string) {
  return value ? `${value}T00:00:00Z` : '';
}

export function hasInvalidRsvpDeadline(config?: Record<string, unknown>) {
  if (!config?.RSVP_DEADLINE || !config?.WEDDING_DATE) return false;

  const deadline = new Date(String(config.RSVP_DEADLINE));
  const weddingDate = new Date(String(config.WEDDING_DATE));

  if (Number.isNaN(deadline.getTime()) || Number.isNaN(weddingDate.getTime())) {
    return false;
  }

  return deadline >= weddingDate;
}
