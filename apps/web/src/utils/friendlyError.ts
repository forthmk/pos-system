/* ──────────────────────────────────────────────────────────────────────────
 * friendlyError — the message an error notification shows, in plain words
 * for people who aren't technical.
 *
 * The API's own messages are written for people ("A supplier with this
 * name already exists", "Not enough Pork Kasim in stock") — show those.
 * Anything technical (validation paths, database codes, server crashes)
 * gets the plain fallback the caller passes instead.
 * ────────────────────────────────────────────────────────────────────────── */
const NO_CONNECTION = "Couldn't reach the system. Check your internet connection and try again.";
const NO_PERMISSION = "You don't have permission to do this. Please ask your admin.";
const SIGNED_OUT = 'Your session has ended. Please sign in again.';
export const TRY_AGAIN = 'Something went wrong. Please try again.';

// Messages that read like code, not like a sentence for a person.
const TECHNICAL =
    /^(body|params|querystring|headers)\/|must (be|have|match|NOT|equal)|\bER_|SQL|undefined|null|NaN|TypeError|Cannot read|FST_|Request failed with status|Internal Server Error|ECONN|timeout of \d+ms/i;

export function friendlyError(error: unknown, fallback = TRY_AGAIN): string {
    const e = error as {
        response?: { status?: number; data?: { message?: unknown; error?: unknown } };
        message?: string;
        code?: string;
    } | null;

    // No answer from the server at all: offline, server down, wrong address.
    if (!e?.response) {
        return e?.code === 'ERR_NETWORK' || e?.message === 'Network Error' ? NO_CONNECTION : fallback;
    }

    const { status = 0, data } = e.response;
    // The shared axios client passes the bare request when nothing answered.
    if (!status) return NO_CONNECTION;
    // The POS API answers { error, field }; the commissary's { message }.
    const raw = data?.error ?? data?.message;
    const message = typeof raw === 'string' ? raw.trim() : '';
    const readable = !!message && !TECHNICAL.test(message);

    // 401 / 403 with the API's own sentence ("Wrong username or PIN.") say that.
    if (status === 401) return readable ? message : SIGNED_OUT;
    if (status === 403) return readable ? message : NO_PERMISSION;
    if (status >= 500) return fallback;

    return readable ? message : fallback;
}
