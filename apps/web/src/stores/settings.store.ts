import { create } from "zustand";
import {
  getUserTimezone,
  setUserTimezone,
  getTimezoneOffset,
  TIMEZONE_STORAGE_KEY,
} from "@/lib/time";

export const LOCALE_STORAGE_KEY = "foxybot_locale";

interface SettingsState {
  timezone: string;
  timezoneOffset: number;
  locale: string;

  /** Hydrate settings from localStorage */
  init: () => void;
  /** Update timezone */
  setTimezone: (tz: string) => void;
  /** Update locale */
  setLocale: (locale: string) => void;
  /** Reset all to defaults */
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  timezone: "UTC",
  timezoneOffset: 0,
  locale: "vi-VN",

  init: () => {
    const tz = getUserTimezone();
    const locale =
      localStorage.getItem(LOCALE_STORAGE_KEY) ||
      navigator.language ||
      "vi-VN";
    set({
      timezone: tz,
      timezoneOffset: getTimezoneOffset(tz),
      locale,
    });
  },

  setTimezone: (tz: string) => {
    setUserTimezone(tz);
    set({ timezone: tz, timezoneOffset: getTimezoneOffset(tz) });
  },

  setLocale: (locale: string) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    set({ locale });
  },

  reset: () => {
    localStorage.removeItem(TIMEZONE_STORAGE_KEY);
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    const tz = getUserTimezone();
    set({
      timezone: tz,
      timezoneOffset: getTimezoneOffset(tz),
      locale: navigator.language || "vi-VN",
    });
  },
}));
