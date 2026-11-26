import bcrypt from 'bcryptjs';
import type { AuthDevice, AuthStaff, LoginBody } from '@pos-system/shared';
import ApiError from '../../apiError';
import type { DeviceToken, Principal, StaffToken, TokenPayload } from '../../types/fastify';
import { assertNotLocked, recordFailure, recordSuccess } from '../../utils/loginThrottle';
import * as usersRepository from '../users/users.repository';
import * as terminalsRepository from '../terminals/terminals.repository';
import * as terminalsService from '../terminals/terminals.service';

type UserRow = NonNullable<Awaited<ReturnType<typeof usersRepository.getById>>>;
type TerminalRow = NonNullable<Awaited<ReturnType<typeof terminalsRepository.getById>>>;

const SIGN_IN_AGAIN = 'Please sign in again.';

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

/** Staff PIN sign-in. Same message for an unknown user and a wrong PIN. */
export async function login({ username, pin, terminal_code }: LoginBody): Promise<{ principal: AuthStaff; token: StaffToken }> {
    const name = username.trim();
    const key = name.toLowerCase();
    assertNotLocked(key);

    const user = await usersRepository.getByUsername(name);
    if (!user || !(await bcrypt.compare(pin, user.pin_hash))) {
        recordFailure(key);
        throw new ApiError('Wrong username or PIN.', 401);
    }
    if (!user.is_active) throw new ApiError('This account is switched off. Ask a manager.', 403);
    recordSuccess(key);

    let terminal: TerminalRow | null = null;
    if (terminal_code) {
        const found = await terminalsRepository.getByCode(user.store_id, terminal_code.trim());
        if (!found || !found.is_active) throw new ApiError('Unknown terminal.', 404, 'terminal_code');
        if (found.type === 'kiosk') throw new ApiError('Staff cannot sign in on the self-service kiosk.', 403, 'terminal_code');
        terminal = found;
    }

    await usersRepository.touchLogin(user.id);
    return {
        principal: staffPrincipal(user, terminal),
        token: { kind: 'staff', sub: user.id, store_id: user.store_id, role: user.role, terminal_id: terminal?.id ?? null },
    };
}

/** A paired kiosk / KDS screen signs in with its device token. */
export async function deviceLogin(deviceToken: string): Promise<{ principal: AuthDevice; token: DeviceToken }> {
    const terminal = await terminalsService.renew(deviceToken);
    return {
        principal: devicePrincipal(terminal),
        token: {
            kind: 'device',
            sub: terminal.id,
            store_id: terminal.store_id,
            type: terminal.type as DeviceToken['type'],
            pair: terminalsService.pairTag(terminal.device_token_hash!),
        },
    };
}

/**
 * Who a JWT belongs to, read fresh from the DB on every request: a user
 * switched off, or a screen unpaired / paired again, loses access at once
 * instead of when the token runs out.
 */
export async function resolvePrincipal(token: TokenPayload): Promise<Principal> {
    if (token?.kind === 'staff') {
        const user = await usersRepository.getById(token.sub);
        if (!user || !user.is_active) throw new ApiError(SIGN_IN_AGAIN, 401);
        let terminal: TerminalRow | null = null;
        if (token.terminal_id) {
            terminal = (await terminalsRepository.getById(token.terminal_id)) ?? null;
            if (!terminal || !terminal.is_active) throw new ApiError(SIGN_IN_AGAIN, 401);
        }
        return staffPrincipal(user, terminal);
    }
    if (token?.kind === 'device') {
        const terminal = await terminalsRepository.getById(token.sub);
        const stillPaired =
            terminal?.is_active && terminal.device_token_hash && terminalsService.pairTag(terminal.device_token_hash) === token.pair;
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
