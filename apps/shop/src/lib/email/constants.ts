// Every number the Email module uses. Pure — the Guide and the screens read
// these, never typed numbers (standing rule).

// Amazon SES reviews accounts above these rates (bounce 5%, complaint 0.1%).
export const BOUNCE_LIMIT_PCT = 5;
export const BOUNCE_WARN_PCT = 2;
export const COMPLAINT_LIMIT_PCT = 0.1;
export const COMPLAINT_WARN_PCT = 0.05;

// The hourly run is "stopped" when the last one is older than this.
export const RUN_STALE_HOURS = 2;
// A run that started this long ago without finishing counts as failed.
export const RUN_UNFINISHED_MINUTES = 10;

// "Orders after email": paid within this many days of the email.
export const ATTRIBUTION_DAYS = 7;
// Cart recovered: the customer paid another order within this many hours of a reminder.
export const CART_RECOVERY_HOURS = 24;
// Overview window.
export const STATS_DAYS = 30;

// Sending. Stop with headroom before the 300 s function limit; the rest
// goes out on the next hourly run.
export const SEND_TIME_BUDGET_MS = 240_000;
export const MAX_SEND_ATTEMPTS = 3;
export const CAMPAIGN_BATCH = 200;

// Scheduling: on the hour, at most this far ahead.
export const MAX_SCHEDULE_DAYS = 90;

export const CAMPAIGNS_PER_PAGE = 25;
export const RUNS_SHOWN = 48;
