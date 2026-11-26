import { Type } from '@sinclair/typebox';

export const pair = { params: Type.Object({ id: Type.Integer({ minimum: 1 }) }) };
