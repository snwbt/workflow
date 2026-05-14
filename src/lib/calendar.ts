export type CalendarInviteType = 'friday_saturday' | 'saturday_only';

export interface CalendarEvent {
  id: 'friday' | 'saturday';
  title: string;
  location: string;
  description: string;
  start: Date;
  end: Date;
}

type LegacyCalendarEvent = {
  title: string;
  location: string;
  description: string;
  startTime: Date;
  endTime: Date;
};

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function parseDateParts(value: string) {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) return null;
  return { day, month, year };
}

function parseTimeParts(value: string) {
  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return { hour: 9, minute: 0 };
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = match[3].toUpperCase();
  if (suffix === 'PM' && hour < 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
}

function buildDate(dateText: string, timeText: string) {
  const date = parseDateParts(dateText) || { day: 23, month: 9, year: 2026 };
  const time = parseTimeParts(timeText);
  return new Date(date.year, date.month, date.day, time.hour, time.minute, 0);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function getScheduleDay(scheduleConfig: any, key: 'friday' | 'saturday') {
  const days = Array.isArray(scheduleConfig?.days) ? scheduleConfig.days : [];
  const needle = key === 'friday' ? /friday|23 october/i : /saturday|24 october/i;
  return days.find((day: any) => needle.test(`${day.label || ''} ${day.date || ''}`));
}

function buildEventFromDay(day: any, fallback: CalendarEvent): CalendarEvent {
  if (!day?.events?.length) return fallback;
  const events = day.events;
  const first = events[0];
  const last = events[events.length - 1];
  const main = events.find((event: any) => /dinner|mass/i.test(event.title || '')) || first;
  const start = buildDate(day.date || '', first.time || main.time || '');
  const end = last?.time ? buildDate(day.date || '', last.time) : addHours(start, fallback.id === 'friday' ? 3.5 : 3);
  return {
    ...fallback,
    title: fallback.title,
    location: cleanText(main.location || fallback.location),
    description: events.map((event: any) => [event.time, event.title, event.notes].filter(Boolean).join(' - ')).join('\n'),
    start,
    end: end > start ? end : fallback.end,
  };
}

export function getCalendarEvents(inviteType: CalendarInviteType | null | undefined, scheduleConfig: any, config: Record<string, any> = {}) {
  const fridayStart = buildDate('23 October 2026', '6:45 PM');
  const saturdayStart = buildDate('24 October 2026', '10:00 AM');
  const fridayFallback: CalendarEvent = {
    id: 'friday',
    title: 'Russell & Siaw Min Wedding Dinner',
    location: [config.VENUE_NAME || 'The Westin Singapore', config.VENUE_ADDRESS].filter(Boolean).join(', '),
    description: 'Wedding dinner reception.',
    start: fridayStart,
    end: addHours(fridayStart, 3.5),
  };
  const saturdayFallback: CalendarEvent = {
    id: 'saturday',
    title: 'Russell & Siaw Min Nuptial Mass',
    location: [config.VENUE_DAY_TWO_NAME || 'Church of the Holy Family', config.VENUE_DAY_TWO_ADDRESS].filter(Boolean).join(', '),
    description: 'Nuptial Mass and celebration.',
    start: saturdayStart,
    end: addHours(saturdayStart, 3),
  };

  const events: CalendarEvent[] = [];
  if (inviteType === 'friday_saturday') {
    events.push(buildEventFromDay(getScheduleDay(scheduleConfig, 'friday'), fridayFallback));
  }
  if (inviteType === 'friday_saturday' || inviteType === 'saturday_only') {
    events.push(buildEventFromDay(getScheduleDay(scheduleConfig, 'saturday'), saturdayFallback));
  }
  return events;
}

export function getGoogleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatCalendarDate(event.start)}/${formatCalendarDate(event.end)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.description,
    location: event.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function getIcsContent(event: CalendarEvent) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Russell Siaw Min Wedding//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}-${formatCalendarDate(event.start)}@wedding-rsvp`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(event.start)}`,
    `DTEND:${formatCalendarDate(event.end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(event.location)}`,
    `DESCRIPTION:${icsEscape(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function getIcsDataUrl(event: CalendarEvent) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(getIcsContent(event))}`;
}

function normalizeCalendarEvent(event: CalendarEvent | LegacyCalendarEvent): CalendarEvent {
  if ('start' in event) return event;
  return {
    id: 'friday',
    title: event.title,
    location: event.location,
    description: event.description,
    start: event.startTime,
    end: event.endTime,
  };
}

export function generateIcs(event: CalendarEvent | LegacyCalendarEvent) {
  return getIcsContent(normalizeCalendarEvent(event));
}

export function createIcsDownloadUrl(event: CalendarEvent | LegacyCalendarEvent) {
  return getIcsDataUrl(normalizeCalendarEvent(event));
}

export function getCalendarLinks(event: CalendarEvent) {
  return {
    google: getGoogleCalendarUrl(event),
    outlook: getOutlookCalendarUrl(event),
    ics: getIcsDataUrl(event),
  };
}

export function renderCalendarEmailHtml(events: CalendarEvent[]) {
  if (!events.length) return '';
  const button = (href: string, label: string) => (
    `<a href="${href}" style="display:inline-block;margin:6px 8px 6px 0;padding:10px 14px;border:1px solid #d8c7a6;color:#2c2420;text-decoration:none;font-size:13px;font-weight:700;">${label}</a>`
  );

  return `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #d8c7a6;">
      <h2 style="font-family:Georgia,serif;font-weight:400;font-size:22px;margin:0 0 12px;">Add to Calendar</h2>
      ${events.map((event) => {
        const links = getCalendarLinks(event);
        return `
          <div style="margin-bottom:18px;">
            <p style="margin:0 0 8px;font-weight:700;">${event.title}</p>
            ${button(links.google, 'Add to Google Calendar')}
            ${button(links.outlook, 'Add to Outlook Calendar')}
            ${button(links.ics, 'Add to Apple Calendar / download .ics')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}
