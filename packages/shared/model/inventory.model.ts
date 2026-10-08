import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const InventorySchema = StrictObject({
  inventory_id: Type.Number(),
  menu_item_id: Type.Number(),
  stock_qty: Type.Number(),
  unit: Type.String(),
  min_stock: Type.Number(),
  updated_at: Type.String({ format: 'date-time' }),
});

export const UpdateInventorySchema = StrictObject({
  stock_qty: Type.Optional(Type.Number({ minimum: 0 })),
  unit: Type.Optional(Type.String({ maxLength: 30 })),
  min_stock: Type.Optional(Type.Number({ minimum: 0 })),
});

export const AdjustStockSchema = StrictObject({
  adjustment: Type.Number(),
});

export const InventoryListQuerySchema = Type.Intersect([
  PaginationSchema,
  Type.Object({
    low_stock: Type.Optional(Type.Boolean()),
  }),
]);

export const InventoryListResponseSchema = createPaginatedResponse(InventorySchema);

export type Inventory = Static<typeof InventorySchema>;
export type UpdateInventoryPayload = Static<typeof UpdateInventorySchema>;
export type AdjustStockPayload = Static<typeof AdjustStockSchema>;
export type InventoryListQuery = Static<typeof InventoryListQuerySchema>;
