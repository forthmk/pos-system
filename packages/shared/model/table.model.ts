import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const TableStatusSchema = Type.Union([
  Type.Literal('available'),
  Type.Literal('occupied'),
]);

export const TableSchema = StrictObject({
  table_id: Type.Number(),
  table_number: Type.Number(),
  capacity: Type.Number(),
  status: TableStatusSchema,
});

export const CreateTableSchema = StrictObject({
  table_number: Type.Number({ minimum: 1 }),
  capacity: Type.Optional(Type.Number({ minimum: 1, default: 4 })),
});

export const UpdateTableSchema = StrictObject({
  table_number: Type.Optional(Type.Number({ minimum: 1 })),
  capacity: Type.Optional(Type.Number({ minimum: 1 })),
  status: Type.Optional(TableStatusSchema),
});

export const TableListQuerySchema = PaginationSchema;

export const TableListResponseSchema = createPaginatedResponse(TableSchema);

export type RestaurantTable = Static<typeof TableSchema>;
export type CreateTablePayload = Static<typeof CreateTableSchema>;
export type UpdateTablePayload = Static<typeof UpdateTableSchema>;
export type TableListQuery = Static<typeof TableListQuerySchema>;
