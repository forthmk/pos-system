import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const OrderStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('preparing'),
  Type.Literal('ready'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
]);

export const OrderTypeSchema = Type.Union([
  Type.Literal('dine-in'),
  Type.Literal('takeout'),
]);

export const OrderItemStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('preparing'),
  Type.Literal('ready'),
  Type.Literal('served'),
]);

export const OrderItemSchema = StrictObject({
  order_item_id: Type.Number(),
  order_id: Type.Number(),
  menu_item_id: Type.Number(),
  quantity: Type.Number(),
  unit_price: Type.Number(),
  subtotal: Type.Number(),
  notes: Type.Union([Type.String(), Type.Null()]),
  status: OrderItemStatusSchema,
});

export const OrderSchema = StrictObject({
  order_id: Type.Number(),
  user_id: Type.Number(),
  table_id: Type.Union([Type.Number(), Type.Null()]),
  order_type: OrderTypeSchema,
  status: OrderStatusSchema,
  total_amount: Type.Number(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
});

export const OrderWithItemsSchema = Type.Intersect([
  OrderSchema,
  Type.Object({ items: Type.Array(OrderItemSchema) }),
]);

export const CreateOrderItemSchema = StrictObject({
  menu_item_id: Type.Number(),
  quantity: Type.Number({ minimum: 1 }),
  notes: Type.Optional(Type.String({ maxLength: 255 })),
});

export const CreateOrderSchema = StrictObject({
  table_id: Type.Optional(Type.Number()),
  order_type: Type.Optional(OrderTypeSchema),
  items: Type.Array(CreateOrderItemSchema, { minItems: 1 }),
});

export const UpdateOrderStatusSchema = StrictObject({
  status: OrderStatusSchema,
});

export const OrderListQuerySchema = Type.Intersect([
  PaginationSchema,
  Type.Object({
    status: Type.Optional(OrderStatusSchema),
    table_id: Type.Optional(Type.Number()),
    order_type: Type.Optional(OrderTypeSchema),
  }),
]);

export const OrderListResponseSchema = createPaginatedResponse(OrderSchema);

export type Order = Static<typeof OrderSchema>;
export type OrderItem = Static<typeof OrderItemSchema>;
export type OrderWithItems = Static<typeof OrderWithItemsSchema>;
export type CreateOrderPayload = Static<typeof CreateOrderSchema>;
export type CreateOrderItemPayload = Static<typeof CreateOrderItemSchema>;
export type UpdateOrderStatusPayload = Static<typeof UpdateOrderStatusSchema>;
export type OrderListQuery = Static<typeof OrderListQuerySchema>;
export type OrderStatus = Static<typeof OrderStatusSchema>;
