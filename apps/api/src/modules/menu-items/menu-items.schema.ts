import { Type } from '@sinclair/typebox';

export const list = {
  querystring: Type.Object({
    page: Type.Optional(Type.Number({ minimum: 1 })),
    limit: Type.Optional(Type.Number({ minimum: 1 })),
    search: Type.Optional(Type.String()),
    category_id: Type.Optional(Type.Number()),
    is_available: Type.Optional(Type.Boolean()),
  }),
};

export const getById = {
  params: Type.Object({ id: Type.Number() }),
};

export const create = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 150 }),
    description: Type.Optional(Type.String()),
    price: Type.Number({ minimum: 0 }),
    category_id: Type.Number(),
    image_url: Type.Optional(Type.String({ maxLength: 500 })),
    is_available: Type.Optional(Type.Boolean()),
  }),
};

export const update = {
  params: Type.Object({ id: Type.Number() }),
  body: Type.Object({
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    price: Type.Optional(Type.Number({ minimum: 0 })),
    category_id: Type.Optional(Type.Number()),
    image_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    is_available: Type.Optional(Type.Boolean()),
  }),
};

export const remove = {
  params: Type.Object({ id: Type.Number() }),
};
