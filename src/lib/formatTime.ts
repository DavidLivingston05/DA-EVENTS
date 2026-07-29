export const formatTimeWithAmPm = (timeStr: string, ampm?: 'AM' | 'PM') => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();

  // If ampm parameter is explicitly supplied
  if (ampm) {
    const cleanTime = trimmed.replace(/\s*(AM|PM|am|pm)/i, '').trim();
    const parts = cleanTime.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].slice(0, 2);
      if (!isNaN(hours)) {
        hours = hours % 12;
        if (hours === 0) hours = 12;
        const formattedHours = String(hours).padStart(2, '0');
        return `${formattedHours}:${minutes} ${ampm}`;
      }
    }
    return `${cleanTime} ${ampm}`;
  }

  // If timeStr already has AM or PM
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // Parse 24-hour time e.g. "06:30" or "18:30"
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2);
    if (!isNaN(hours)) {
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const formattedHours = String(hours).padStart(2, '0');
      return `${formattedHours}:${minutes} ${period}`;
    }
  }

  return timeStr;
};

export const getTodayDateString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const isEventUpcoming = (dateStr: string) => {
  if (!dateStr) return false;
  const todayStr = getTodayDateString();
  return dateStr >= todayStr;
};
