import { createHash, randomBytes } from 'node:crypto';
import ApiError from '../../apiError';
import * as repository from './terminals.repository';

// Kiosk and kitchen screens stay signed in with a device token (design §2.2):
// an admin pairs the screen once, the token is shown that one time and only
// its SHA-256 hash is stored. Cashier registers (pos) are not paired — staff
// sign in there with their PIN.

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
/** Short tag of the current hash, carried in device JWTs (see DeviceToken). */
export const pairTag = (hash: string) => hash.slice(0, 12);

export async function pair(id: number, storeId: number) {
    const terminal = await repository.getById(id);
    if (!terminal || terminal.store_id !== storeId) throw new ApiError('Terminal not found.', 404);
    if (terminal.type === 'pos') {
        throw new ApiError('Cashier registers are not paired — staff sign in there with their PIN.', 400, 'id');
    }
    if (!terminal.is_active) throw new ApiError('This terminal is switched off.', 400, 'id');

    const deviceToken = `qbd_${randomBytes(32).toString('base64url')}`;
    await repository.setTokenHash(id, hashToken(deviceToken));
    return {
        terminal: { id: terminal.id, code: terminal.code, type: terminal.type, name: terminal.name },
        device_token: deviceToken,
    };
}

/** A paired kiosk / KDS screen signing in again. */
export async function renew(deviceToken: string) {
    const terminal = await repository.getByTokenHash(hashToken(deviceToken));
    if (!terminal || !terminal.is_active || terminal.type === 'pos') {
        throw new ApiError('This screen is not paired. Ask an admin to pair it again.', 401);
    }
    await repository.touchSeen(terminal.id);
    return terminal;
}

export const list = (storeId: number) => repository.list(storeId);
