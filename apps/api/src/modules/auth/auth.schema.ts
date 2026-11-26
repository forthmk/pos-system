import { DeviceLoginBodySchema, LoginBodySchema } from '@pos-system/shared';

export const pinLogin = { body: LoginBodySchema };

export const device = { body: DeviceLoginBodySchema };
