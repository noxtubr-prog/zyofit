// Client-side login throttling to discourage brute-force attempts from the
// browser. Note: this is a UX safeguard — real enforcement must happen at the
// auth provider level.

const STORAGE_KEY = "zf_login_attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

type AttemptRecord = {
  attempts: number[]; // timestamps of recent failures
  lockedUntil?: number;
};

const keyFor = (identifier: string) =>
  `${STORAGE_KEY}:${identifier.trim().toLowerCase()}`;

const read = (identifier: string): AttemptRecord => {
  try {
    const raw = localStorage.getItem(keyFor(identifier));
    if (!raw) return { attempts: [] };
    return JSON.parse(raw) as AttemptRecord;
  } catch {
    return { attempts: [] };
  }
};

const write = (identifier: string, rec: AttemptRecord) => {
  try {
    localStorage.setItem(keyFor(identifier), JSON.stringify(rec));
  } catch {
    /* ignore quota errors */
  }
};

export const getLockoutRemainingMs = (identifier: string): number => {
  if (!identifier) return 0;
  const rec = read(identifier);
  if (!rec.lockedUntil) return 0;
  const remaining = rec.lockedUntil - Date.now();
  if (remaining <= 0) {
    write(identifier, { attempts: [] });
    return 0;
  }
  return remaining;
};

export const registerFailedAttempt = (identifier: string): { locked: boolean; remainingMs: number } => {
  if (!identifier) return { locked: false, remainingMs: 0 };
  const now = Date.now();
  const rec = read(identifier);
  const recent = rec.attempts.filter((t) => now - t < WINDOW_MS);
  recent.push(now);

  if (recent.length >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS;
    write(identifier, { attempts: recent, lockedUntil });
    return { locked: true, remainingMs: LOCKOUT_MS };
  }

  write(identifier, { attempts: recent });
  return { locked: false, remainingMs: 0 };
};

export const clearAttempts = (identifier: string) => {
  if (!identifier) return;
  try {
    localStorage.removeItem(keyFor(identifier));
  } catch {
    /* ignore */
  }
};

export const formatRemaining = (ms: number): string => {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};
