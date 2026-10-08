import { Type } from '@sinclair/typebox';

export const list = {
  querystring: Type.Object({
    page: Type.Optional(Type.Number({ minimum: 1 })),
    limit: Type.Optional(Type.Number({ minimum: 1 })),
    search: Type.Optional(Type.String()),
  }),
};

export const getById = {
  params: Type.Object({ id: Type.Number() }),
};

export const create = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 100 }),
    description: Type.Optional(Type.String()),
  }),
};

export const update = {
  params: Type.Object({ id: Type.Number() }),
  body: Type.Object({
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  }),
};

export const remove = {
  params: Type.Object({ id: Type.Number() }),
};
