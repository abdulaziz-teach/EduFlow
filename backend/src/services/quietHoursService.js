/**
 * Quiet Hours Service
 * Evaluates whether a notification falls within user's designated quiet hours
 * using timezone-aware calculations.
 */

// Safe timezone check
export function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current time in specified timezone as { hours, minutes, totalMinutes }
 */
export function getTimeInTimezone(date, timezone = 'UTC') {
  const safeTimezone = isValidTimezone(timezone) ? timezone : 'UTC';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  let hours = 0;
  let minutes = 0;

  for (const part of parts) {
    if (part.type === 'hour') hours = parseInt(part.value, 10);
    if (part.type === 'minute') minutes = parseInt(part.value, 10);
  }

  // Handle midnight 24 edge case
  if (hours === 24) hours = 0;

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

/**
 * Parse "HH:mm" string into total minutes from midnight
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return (h % 24) * 60 + (m % 60);
}

/**
 * Evaluates whether a given date is within quiet hours for a user
 * @param {Object} quietHoursConfig - { enabled, start, end, timezone }
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ inQuietHours: boolean, nextAllowedDate: Date|null }}
 */
export function isWithinQuietHours(quietHoursConfig, referenceDate = new Date()) {
  if (!quietHoursConfig || !quietHoursConfig.enabled) {
    return { inQuietHours: false, nextAllowedDate: null };
  }

  const { start = '22:00', end = '08:00', timezone = 'UTC' } = quietHoursConfig;
  const userTime = getTimeInTimezone(referenceDate, timezone);
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  const currentMinutes = userTime.totalMinutes;

  let inQuietHours = false;

  if (startMinutes < endMinutes) {
    // Same-day window: e.g. 13:00 to 17:00
    inQuietHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window: e.g. 22:00 to 08:00
    inQuietHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  if (!inQuietHours) {
    return { inQuietHours: false, nextAllowedDate: null };
  }

  // Calculate approximate nextAllowedDate when quiet hours end
  // Difference between current minutes and end minutes
  let minutesUntilEnd = 0;
  if (currentMinutes < endMinutes) {
    minutesUntilEnd = endMinutes - currentMinutes;
  } else {
    // Current is after start (e.g. 23:00), end is next day (e.g. 08:00)
    minutesUntilEnd = 24 * 60 - currentMinutes + endMinutes;
  }

  const nextAllowedDate = new Date(referenceDate.getTime() + minutesUntilEnd * 60 * 1000);
  return { inQuietHours: true, nextAllowedDate };
}
