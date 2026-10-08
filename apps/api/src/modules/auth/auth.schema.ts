import { Type } from '@sinclair/typebox';

export const login = {
  body: Type.Object({
    username: Type.String({ minLength: 1 }),
    password: Type.String({ minLength: 1 }),
  }),
};

export const me = {};
