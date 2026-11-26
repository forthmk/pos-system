import 'fastify';
import '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthDevice, AuthStaff, DeviceType, Permission, Role } from '@pos-system/shared';

// What a JWT carries. Kept small on purpose: who it is, nothing that can go
// stale — the user / terminal is re-read from the DB on every request.
export type StaffToken = { kind: 'staff'; sub: number; store_id: number; role: Role; terminal_id: number | null };
// `pair` = the first 12 characters of the terminal's device-token hash.
// Pairing the screen again changes the hash, so older device JWTs stop working.
export type DeviceToken = { kind: 'device'; sub: number; store_id: number; type: DeviceType; pair: string };
export type TokenPayload = StaffToken | DeviceToken;

export type Principal = AuthStaff | AuthDevice;

type PreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: TokenPayload;
        user: TokenPayload;
    }
}

declare module 'fastify' {
    interface FastifyInstance {
        /** A valid JWT for an active user / paired screen. Sets request.principal. */
        authenticate: PreHandler;
        /** authenticate + the caller's role / screen type may do `permission`. */
        checkPermission: (permission: Permission) => PreHandler;
    }

    interface FastifyRequest {
        principal?: Principal;
    }
}
