import { Type } from '@sinclair/typebox';
import { KioskMenuQuerySchema, PlaceKioskOrderBodySchema } from '@pos-system/shared';

export const menu = { querystring: KioskMenuQuerySchema };

export const placeOrder = { body: PlaceKioskOrderBodySchema };

export const order = { params: Type.Object({ id: Type.Integer({ minimum: 1 }) }) };
