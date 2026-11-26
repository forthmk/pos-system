import type { DeviceLoginBody, LoginBody } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TokenPayload } from '../../types/fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './auth.service';

// Staff tokens last a working day; a paired screen's token 30 days (it renews
// itself with POST /auth/device before that).
const STAFF_TTL = '12h';
const DEVICE_TTL = '30d';

const sign = (request: FastifyRequest, payload: TokenPayload) =>
    request.server.jwt.sign(payload, { expiresIn: payload.kind === 'staff' ? STAFF_TTL : DEVICE_TTL });

// POST /auth/pin-login — username + PIN (+ the terminal: POS-01, EXPO-01).
export async function pinLogin(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const { principal, token } = await service.login(request.body);
    return sendResult(reply, { token: sign(request, token), principal });
}

// POST /auth/device — a paired kiosk / KDS screen signs in with its device token.
export async function device(request: FastifyRequest<{ Body: DeviceLoginBody }>, reply: FastifyReply) {
    const { principal, token } = await service.deviceLogin(request.body.device_token);
    return sendResult(reply, { token: sign(request, token), principal });
}

// GET /auth/me — who the caller is now, with a fresh token.
export async function me(request: FastifyRequest, reply: FastifyReply) {
    const principal = request.principal!;
    return sendResult(reply, { token: sign(request, service.refreshToken(principal, request.user)), principal });
}
