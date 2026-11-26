import { Type } from '@sinclair/typebox';
import {
    AvailabilityBodySchema,
    CloseShiftBodySchema,
    OpenShiftBodySchema,
    PosOrderBodySchema,
    SettleBodySchema,
    VoidOrderBodySchema,
    VoucherCheckBodySchema,
} from '@pos-system/shared';

const id = Type.Object({ id: Type.Integer({ minimum: 1 }) });

export const availability = { params: id, body: AvailabilityBodySchema };
export const scan = { params: Type.Object({ code: Type.String({ minLength: 1, maxLength: 30 }) }) };
export const byId = { params: id };
export const openShift = { body: OpenShiftBodySchema };
export const voucher = { body: VoucherCheckBodySchema };
export const placeOrder = { body: PosOrderBodySchema };
export const settle = { params: id, body: SettleBodySchema };
export const queue = { querystring: Type.Object({ status: Type.Literal('awaiting_payment') }) };
export const closeShift = { params: id, body: CloseShiftBodySchema };
export const voidOrder = { params: id, body: VoidOrderBodySchema };
