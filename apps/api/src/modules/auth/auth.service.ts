import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AuthDevice, AuthStaff, LoginBody } from '@pos-system/shared';
import ApiError from '../../apiError';
import type { DeviceToken, Principal, StaffToken, TokenPayload } from '../../types/fastify';
import { assertNotLocked, recordFailure, recordSuccess } from '../../utils/loginThrottle';
import * as repository from './auth.repository';

/* ──────────────────────────────────────────────────────────────────────────
 * Who is using the system (design §2.2):
 *   staff    — username + PIN at a register / kitchen screen (login)
 *   screens  — a kiosk / kitchen display paired once by an admin (pair) and
 *              signing itself in with its device token (deviceLogin)
 * and, on every request, who a token belongs to right now (resolvePrincipal).
 * ────────────────────────────────────────────────────────────────────────── */

type UserRow = NonNullable<Awaited<ReturnType<typeof repository.getUserById>>>;
type TerminalRow = NonNullable<Awaited<ReturnType<typeof repository.getTerminalById>>>;

const SIGN_IN_AGAIN = 'Please sign in again.';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
/** Short tag of the current device-token hash, carried in device JWTs. */
export const pairTag = (hash: string) => hash.slice(0, 12);

const staffPrincipal = (user: UserRow, terminal: TerminalRow | null): AuthStaff => ({
    kind: 'staff',
    id: user.id,
    store_id: user.store_id,
    username: user.username,
    name: user.name,
    role: user.role,
    terminal: terminal ? { id: terminal.id, code: terminal.code, type: terminal.type } : null,
});

const devicePrincipal = (terminal: TerminalRow): AuthDevice => ({
    kind: 'device',
    id: terminal.id,
    store_id: terminal.store_id,
    code: terminal.code,
    name: terminal.name,
    type: terminal.type as AuthDevice['type'],
    kds_station_id: terminal.kds_station_id,
});

/* ── staff ─────────────────────────────────────────────────────────────── */

/** Staff PIN sign-in. Same message for an unknown user and a wrong PIN. */
export async function login({ username, pin, terminal_code }: LoginBody): Promise<{ principal: AuthStaff; token: StaffToken }> {
    const name = username.trim();
    const key = name.toLowerCase();
    assertNotLocked(key);

    const user = await repository.getUserByUsername(name);
    if (!user || !(await bcrypt.compare(pin, user.pin_hash))) {
        recordFailure(key);
        throw new ApiError('Wrong username or PIN.', 401);
    }
    if (!user.is_active) throw new ApiError('This account is switched off. Ask a manager.', 403);
    recordSuccess(key);

    let terminal: TerminalRow | null = null;
    if (terminal_code) {
        const found = await repository.getTerminalByCode(user.store_id, terminal_code.trim());
        if (!found || !found.is_active) throw new ApiError('Unknown terminal.', 404, 'terminal_code');
        if (found.type === 'kiosk') throw new ApiError('Staff cannot sign in on the self-service kiosk.', 403, 'terminal_code');
        terminal = found;
    }

    await repository.touchLogin(user.id);
    return {
        principal: staffPrincipal(user, terminal),
        token: { kind: 'staff', sub: user.id, store_id: user.store_id, role: user.role, terminal_id: terminal?.id ?? null },
    };
}

/* ── screens (kiosk / kitchen display) ─────────────────────────────────── */

/** Admin: a new device token for a kiosk / KDS, shown once; only its hash is kept. */
export async function pair(id: number, storeId: number) {
    const terminal = await repository.getTerminalById(id);
    if (!terminal || terminal.store_id !== storeId) throw new ApiError('Terminal not found.', 404);
    if (terminal.type === 'pos') throw new ApiError('Cashier registers are not paired — staff sign in there with their PIN.', 400, 'id');
    if (!terminal.is_active) throw new ApiError('This terminal is switched off.', 400, 'id');

    const deviceToken = `qbd_${randomBytes(32).toString('base64url')}`;
    await repository.setTerminalTokenHash(id, hashToken(deviceToken));
    return { terminal: { id: terminal.id, code: terminal.code, type: terminal.type, name: terminal.name }, device_token: deviceToken };
}

export const listTerminals = (storeId: number) => repository.listTerminals(storeId);

/** A paired kiosk / KDS screen signs in with its device token. */
export async function deviceLogin(deviceToken: string): Promise<{ principal: AuthDevice; token: DeviceToken }> {
    const terminal = await repository.getTerminalByTokenHash(hashToken(deviceToken));
    if (!terminal || !terminal.is_active || terminal.type === 'pos') {
        throw new ApiError('This screen is not paired. Ask an admin to pair it again.', 401);
    }
    await repository.touchTerminalSeen(terminal.id);
    return {
        principal: devicePrincipal(terminal),
        token: { kind: 'device', sub: terminal.id, store_id: terminal.store_id, type: terminal.type as DeviceToken['type'], pair: pairTag(terminal.device_token_hash!) },
    };
}

/* ── every request ─────────────────────────────────────────────────────── */

/**
 * Who a JWT belongs to, read fresh from the DB: a user switched off, or a
 * screen unpaired / paired again, loses access at once.
 */
export async function resolvePrincipal(token: TokenPayload): Promise<Principal> {
    if (token?.kind === 'staff') {
        const user = await repository.getUserById(token.sub);
        if (!user || !user.is_active) throw new ApiError(SIGN_IN_AGAIN, 401);
        let terminal: TerminalRow | null = null;
        if (token.terminal_id) {
            terminal = (await repository.getTerminalById(token.terminal_id)) ?? null;
            if (!terminal || !terminal.is_active) throw new ApiError(SIGN_IN_AGAIN, 401);
        }
        return staffPrincipal(user, terminal);
    }
    if (token?.kind === 'device') {
        const terminal = await repository.getTerminalById(token.sub);
        const stillPaired = terminal?.is_active && terminal.device_token_hash && pairTag(terminal.device_token_hash) === token.pair;
        if (!terminal || !stillPaired) throw new ApiError('This screen must be paired again.', 401);
        return devicePrincipal(terminal);
    }
    throw new ApiError(SIGN_IN_AGAIN, 401);
}

/** A fresh token for /auth/me, from the caller as they are now. */
export function refreshToken(principal: Principal, current: TokenPayload): TokenPayload {
    if (principal.kind === 'staff') {
        return { kind: 'staff', sub: principal.id, store_id: principal.store_id, role: principal.role, terminal_id: principal.terminal?.id ?? null };
    }
    return current;
}
