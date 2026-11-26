import { Type } from '@sinclair/typebox';
import { KdsQuerySchema } from '@pos-system/shared';

export const tickets = { querystring: KdsQuerySchema };

export const byId = { params: Type.Object({ id: Type.Integer({ minimum: 1 }) }) };
