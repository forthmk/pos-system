import { Type } from '@sinclair/typebox';
import { DeviceLoginBodySchema, LoginBodySchema } from '@pos-system/shared';

export const pinLogin = { body: LoginBodySchema };

export const device = { body: DeviceLoginBodySchema };

export const pair = { params: Type.Object({ id: Type.Integer({ minimum: 1 }) }) };
