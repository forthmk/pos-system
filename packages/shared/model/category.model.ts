import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const CategorySchema = StrictObject({
  category_id: Type.Number(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
});

export const CreateCategorySchema = StrictObject({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String()),
});

export const UpdateCategorySchema = StrictObject({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const CategoryListQuerySchema = PaginationSchema;

export const CategoryListResponseSchema = createPaginatedResponse(CategorySchema);

export type Category = Static<typeof CategorySchema>;
export type CreateCategoryPayload = Static<typeof CreateCategorySchema>;
export type UpdateCategoryPayload = Static<typeof UpdateCategorySchema>;
export type CategoryListQuery = Static<typeof CategoryListQuerySchema>;
