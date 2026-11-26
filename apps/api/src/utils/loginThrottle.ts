import ApiError from '../apiError';

// PINs are short, so wrong guesses are limited: 5 wrong PINs for a username
// locks it for 5 minutes. Kept in memory — a restart clears it, which is fine
// for one API process per store.
export const MAX_FAILURES = 5;
export const LOCK_MS = 5 * 60_000;

const failures = new Map<string, { count: number; lockedUntil: number }>();

export function assertNotLocked(key: string, now = Date.now()) {
    const entry = failures.get(key);
    if (entry && entry.lockedUntil > now) {
        const minutes = Math.ceil((entry.lockedUntil - now) / 60_000);
        throw new ApiError(`Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, 429);
    }
}

export function recordFailure(key: string, now = Date.now()) {
    const entry = failures.get(key) ?? { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= MAX_FAILURES) {
        entry.lockedUntil = now + LOCK_MS;
        entry.count = 0;
    }
    failures.set(key, entry);
}

export function recordSuccess(key: string) {
    failures.delete(key);
}

/** Tests only. */
export function clearThrottle() {
    failures.clear();
}
