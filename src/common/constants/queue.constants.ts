export const QUEUE_DEFAULTS = {
  AVG_SERVICE_TIME: 300,
  CAPACITY: 100,
  RECENT_HOURS_WINDOW: 3,
  FALLBACK_DAYS_WINDOW: 7,
} as const;

export const QUEUE_PREFIXES = {
  GENERAL: 'G',
  PRIORITY: 'P',
  VIP: 'V',
} as const;

export const TIME_WINDOWS = {
  RECENT_SERVICE_HOURS: 3,
  FALLBACK_SERVICE_DAYS: 7,
  STATS_REFRESH_MINUTES: 5,
} as const;

export const PRIORITY_LEVELS = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
} as const;
