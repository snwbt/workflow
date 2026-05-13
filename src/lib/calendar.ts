export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z'
  ].join('');
}

export function generateIcs(event: CalendarEvent): string {
  const dtStamp = formatDate(new Date());
  const dtStart = formatDate(event.startTime);
  const dtEnd = formatDate(event.endTime);
  const uid = `${Date.now()}@wedding.events`;

  // Fold long lines according to RFC 5545
  const foldLine = (line: string) => {
    const MAX_LENGTH = 75;
    if (line.length <= MAX_LENGTH) return line;
    let folded = '';
    let curr = line;
    while (curr.length > MAX_LENGTH) {
      folded += curr.substring(0, MAX_LENGTH) + '\r\n ';
      curr = curr.substring(MAX_LENGTH);
    }
    folded += curr;
    return folded;
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Russell and Siaw Min//Wedding//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTAMP:${dtStamp}`,
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title.replace(/[,;\\]/g, '\\$&')}`,
    `DESCRIPTION:${event.description.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location.replace(/[,;\\]/g, '\\$&')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return lines.map(foldLine).join('\r\n');
}

export function createIcsDownloadUrl(event: CalendarEvent): string {
  const icsString = generateIcs(event);
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}
