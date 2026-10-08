import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const PaymentMethodSchema = Type.Union([
  Type.Literal('cash'),
  Type.Literal('card'),
  Type.Literal('online'),
]);

export const PaymentStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('completed'),
  Type.Literal('refunded'),
]);

export const PaymentSchema = StrictObject({
  payment_id: Type.Number(),
  order_id: Type.Number(),
  method: PaymentMethodSchema,
  amount: Type.Number(),
  payment_status: PaymentStatusSchema,
  transaction_ref: Type.Union([Type.String(), Type.Null()]),
  paid_at: Type.String({ format: 'date-time' }),
});

export const CreatePaymentSchema = StrictObject({
  order_id: Type.Number(),
  method: PaymentMethodSchema,
  amount: Type.Number({ minimum: 0 }),
  transaction_ref: Type.Optional(Type.String({ maxLength: 100 })),
});

export const PaymentListQuerySchema = Type.Intersect([
  PaginationSchema,
  Type.Object({
    order_id: Type.Optional(Type.Number()),
    payment_status: Type.Optional(PaymentStatusSchema),
    method: Type.Optional(PaymentMethodSchema),
  }),
]);

export const PaymentListResponseSchema = createPaginatedResponse(PaymentSchema);

export type Payment = Static<typeof PaymentSchema>;
export type CreatePaymentPayload = Static<typeof CreatePaymentSchema>;
export type PaymentListQuery = Static<typeof PaymentListQuerySchema>;
export type PaymentMethod = Static<typeof PaymentMethodSchema>;
