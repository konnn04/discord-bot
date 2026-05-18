// ── Timezone & Time Utilities ──

export const TIMEZONE_STORAGE_KEY = "foxybot_timezone";

/** Common timezones for Asia/Vietnam region + major zones */
export const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (UTC+0)", offset: 0 },
  { value: "Asia/Ho_Chi_Minh", label: "Việt Nam (UTC+7)", offset: 7 },
  { value: "Asia/Bangkok", label: "Bangkok (UTC+7)", offset: 7 },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)", offset: 8 },
  { value: "Asia/Shanghai", label: "Trung Quốc (UTC+8)", offset: 8 },
  { value: "Asia/Tokyo", label: "Nhật Bản (UTC+9)", offset: 9 },
  { value: "Asia/Seoul", label: "Hàn Quốc (UTC+9)", offset: 9 },
  { value: "America/New_York", label: "New York (UTC-5)", offset: -5 },
  { value: "America/Chicago", label: "Chicago (UTC-6)", offset: -6 },
  { value: "America/Los_Angeles", label: "LA (UTC-8)", offset: -8 },
  { value: "Europe/London", label: "London (UTC+0)", offset: 0 },
  { value: "Europe/Paris", label: "Paris (UTC+1)", offset: 1 },
  { value: "Australia/Sydney", label: "Sydney (UTC+11)", offset: 11 },
  { value: "Pacific/Auckland", label: "Auckland (UTC+13)", offset: 13 },
] as const;

/**
 * Get the effective UTC offset (in hours) for a timezone at this moment.
 * Falls back to the stored offset or browser detection.
 */
export function getTimezoneOffset(tz?: string): number {
  const timezone = tz || getUserTimezone();
  if (timezone === "UTC") return 0;

  // For common timezones, return the known offset
  const known = COMMON_TIMEZONES.find((t) => t.value === timezone);
  if (known) return known.offset;

  // Fallback: compute from Intl
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value;
    if (offsetPart) {
      const match = offsetPart.match(/UTC([+-]?\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  } catch {
    // ignore
  }

  return 0;
}

/**
 * Convert UTC hour (0-23) to the equivalent hour in the target timezone.
 */
export function utcHourToTimezone(utcHour: number, offset: number): number {
  return ((utcHour + offset) % 24 + 24) % 24;
}

/**
 * Get user's saved timezone, or detect from browser.
 */
export function getUserTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  const saved = localStorage.getItem(TIMEZONE_STORAGE_KEY);
  if (saved) return saved;
  // Detect from browser
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Save user's timezone preference.
 */
export function setUserTimezone(tz: string): void {
  localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
}

/**
 * Format a date string/Date in the user's timezone.
 */
export function formatInTimezone(
  date: Date | string,
  tz?: string,
  locale: string = "vi-VN",
): string {
  const timezone = tz || getUserTimezone();
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return d.toLocaleString(locale, { timeZone: timezone });
  } catch {
    return d.toLocaleString(locale);
  }
}

/**
 * Get the timezone abbreviation like "ICT", "JST", "UTC"
 */
export function getTimezoneAbbr(tz?: string): string {
  const timezone = tz || getUserTimezone();
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    return parts.find((p) => p.type === "timeZoneName")?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get display label for a timezone value.
 */
export function getTimezoneLabel(tz: string): string {
  const known = COMMON_TIMEZONES.find((t) => t.value === tz);
  if (known) return known.label;
  return tz;
}

/**
 * Convert an array of OnlineFrequencyData (UTC hours with counts)
 * to the target timezone by shifting hours.
 */
export function shiftOnlineDataToTimezone<T extends { hour: number }>(
  data: T[],
  offset: number,
): T[] {
  if (offset === 0) return data;
  return data.map((d) => ({
    ...d,
    hour: utcHourToTimezone(d.hour, offset),
  }));
}
