// Calendar helper for Google Calendar links and downloadable .ics files

export function generateGoogleCalendarUrl(event: {
  eventName: string;
  date: string;
  time: string;
  locationAddress: string;
}): string {
  if (!event || !event.date) return '#';

  const dateStr = event.date.replace(/-/g, '');
  
  // Format start time
  let startHour = 9;
  let startMinute = 0;
  if (event.time) {
    const cleanTime = event.time.replace(/\s*(AM|PM|am|pm)/i, '').trim();
    const parts = cleanTime.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (/PM/i.test(event.time) && h < 12) h += 12;
      if (/AM/i.test(event.time) && h === 12) h = 0;
      if (!isNaN(h)) startHour = h;
      if (!isNaN(m)) startMinute = m;
    }
  }

  const formatPad = (n: number) => String(n).padStart(2, '0');
  const startTimeStr = `${formatPad(startHour)}${formatPad(startMinute)}00`;
  const endHour = (startHour + 2) % 24;
  const endTimeStr = `${formatPad(endHour)}${formatPad(startMinute)}00`;

  const startIso = `${dateStr}T${startTimeStr}`;
  const endIso = `${dateStr}T${endTimeStr}`;

  const title = encodeURIComponent(`⛪ DA-ROS: ${event.eventName}`);
  const details = encodeURIComponent(`DA-ROS Church Event: ${event.eventName}. Location: ${event.locationAddress}`);
  const location = encodeURIComponent(event.locationAddress || 'Church Hall');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

export function downloadIcsFile(event: {
  eventName: string;
  date: string;
  time: string;
  locationAddress: string;
}) {
  if (!event || !event.date) return;

  const dateStr = event.date.replace(/-/g, '');
  const title = event.eventName;
  const location = event.locationAddress || 'Church Hall';

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DA-ROS Church Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:⛪ DA-ROS: ${title}`,
    `DESCRIPTION:Church Event: ${title}. Location: ${location}`,
    `LOCATION:${location}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Event.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
