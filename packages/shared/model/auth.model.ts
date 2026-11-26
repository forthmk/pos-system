import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';

// Staff sign-in on the register or the kitchen screen: username + PIN, and
// the code of the terminal they are standing at (POS-01, EXPO-01).
export const LoginBodySchema = StrictObject({
    username: Type.String({ minLength: 1, maxLength: 60 }),
    pin: Type.String({ minLength: 4, maxLength: 64 }),
    terminal_code: Type.Optional(Type.String({ minLength: 1, maxLength: 20 })),
});
export type LoginBody = Static<typeof LoginBodySchema>;

// A kiosk / KDS screen renewing its sign-in with the device token it was
// given when an admin paired it.
export const DeviceLoginBodySchema = StrictObject({
    device_token: Type.String({ minLength: 20, maxLength: 200 }),
});
export type DeviceLoginBody = Static<typeof DeviceLoginBodySchema>;

export const AuthStaffSchema = Type.Object({
    kind: Type.Literal('staff'),
    id: Type.Number(),
    store_id: Type.Number(),
    username: Type.String(),
    name: Type.String(),
    role: Type.Union([Type.Literal('admin'), Type.Literal('manager'), Type.Literal('cashier'), Type.Literal('chef')]),
    terminal: Type.Union([Type.Null(), Type.Object({ id: Type.Number(), code: Type.String(), type: Type.String() })]),
});
export type AuthStaff = Static<typeof AuthStaffSchema>;

export const AuthDeviceSchema = Type.Object({
    kind: Type.Literal('device'),
    id: Type.Number(),
    store_id: Type.Number(),
    code: Type.String(),
    name: Type.String(),
    type: Type.Union([Type.Literal('kiosk'), Type.Literal('kds')]),
    kds_station_id: Type.Union([Type.Number(), Type.Null()]),
});
export type AuthDevice = Static<typeof AuthDeviceSchema>;

/** What /auth/pin-login, /auth/device and /auth/me return. */
export type AuthSession = { token: string; principal: AuthStaff | AuthDevice };

/** Pairing a kiosk / KDS: the device token is shown once and never stored. */
export type PairTerminalResponse = { terminal: { id: number; code: string; type: string; name: string }; device_token: string };
