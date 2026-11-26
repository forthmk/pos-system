// authApi — who is using the system (backend: apps/api/src/modules/auth).
import { createApi } from '../axios';
import type { AuthSession, DeviceLoginBody, LoginBody, PairTerminalResponse } from '../model';
const { get, post } = createApi();

export const authApi = {
    pinLogin: (data: LoginBody) => post<AuthSession>('/auth/pin-login', data),
    device: (data: DeviceLoginBody) => post<AuthSession>('/auth/device', data),
    me: () => get<AuthSession>('/auth/me'),
    terminals: () => get('/auth/terminals'),
    pairTerminal: (id: number) => post<PairTerminalResponse>(`/auth/terminals/${id}/pair`),
};
