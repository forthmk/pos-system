import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const MenuItemSchema = StrictObject({
  menu_item_id: Type.Number(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  price: Type.Number(),
  category_id: Type.Number(),
  image_url: Type.Union([Type.String(), Type.Null()]),
  is_available: Type.Boolean(),
});

export const CreateMenuItemSchema = StrictObject({
  name: Type.String({ minLength: 1, maxLength: 150 }),
  description: Type.Optional(Type.String()),
  price: Type.Number({ minimum: 0 }),
  category_id: Type.Number(),
  image_url: Type.Optional(Type.String({ maxLength: 500 })),
  is_available: Type.Optional(Type.Boolean()),
});

export const UpdateMenuItemSchema = StrictObject({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  price: Type.Optional(Type.Number({ minimum: 0 })),
  category_id: Type.Optional(Type.Number()),
  image_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  is_available: Type.Optional(Type.Boolean()),
});

export const MenuItemListQuerySchema = Type.Intersect([
  PaginationSchema,
  Type.Object({
    category_id: Type.Optional(Type.Number()),
    is_available: Type.Optional(Type.Boolean()),
  }),
]);

export const MenuItemListResponseSchema = createPaginatedResponse(MenuItemSchema);

export type MenuItem = Static<typeof MenuItemSchema>;
export type CreateMenuItemPayload = Static<typeof CreateMenuItemSchema>;
export type UpdateMenuItemPayload = Static<typeof UpdateMenuItemSchema>;
export type MenuItemListQuery = Static<typeof MenuItemListQuerySchema>;
