import { Type, type Static, type TSchema } from '@sinclair/typebox';

export const PaginationSchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1 })),
  sort: Type.Optional(Type.String()),
  order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  search: Type.Optional(Type.String()),
});

export const createPaginatedResponse = <T extends TSchema>(itemSchema: T) =>
  Type.Object({
    data: Type.Array(itemSchema),
    total: Type.Number(),
    totalPages: Type.Number(),
  });

export type PaginationParams = Static<typeof PaginationSchema>;
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  totalPages: number;
};
