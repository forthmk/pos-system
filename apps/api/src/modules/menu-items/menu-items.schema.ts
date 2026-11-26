import { Type } from '@sinclair/typebox';
import { AvailabilityBodySchema } from '@pos-system/shared';

export const availability = {
    params: Type.Object({ id: Type.Integer({ minimum: 1 }) }),
    body: AvailabilityBodySchema,
};
