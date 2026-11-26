import { Type } from '@sinclair/typebox';
import { AvailabilityBodySchema } from '@pos-system/shared';

const id = Type.Object({ id: Type.Integer({ minimum: 1 }) });

export const availability = { params: id, body: AvailabilityBodySchema };

export const scan = { params: Type.Object({ code: Type.String({ minLength: 1, maxLength: 30 }) }) };

export const release = { params: id };
