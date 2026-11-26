// Import and use:
//   import { authApi, terminalApi } from '@shared/api';
//   authApi.pinLogin({ username, pin, terminal_code }) // staff PIN sign-in
//   authApi.device({ device_token })                   // kiosk / KDS renews its sign-in
//   authApi.me()                                       // who am I now (+ fresh token)
//   terminalApi.list()  ·  terminalApi.pair(id)       // admin: pair a kiosk / KDS screen

import { createApi } from '../axios';
import type { AuthSession, DeviceLoginBody, LoginBody, PairTerminalResponse } from '../model';
const { get, post } = createApi();

export const authApi = {
    pinLogin: (data: LoginBody) => post<AuthSession>('/auth/pin-login', data),
    device: (data: DeviceLoginBody) => post<AuthSession>('/auth/device', data),
    me: () => get<AuthSession>('/auth/me'),
};

export const terminalApi = {
    list: () => get('/terminals'),
    pair: (id: number) => post<PairTerminalResponse>(`/terminals/${id}/pair`),
};
