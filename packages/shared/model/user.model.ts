import { Type, type Static } from '@sinclair/typebox';
import { StrictObject } from '../utils/strict-object';
import { createPaginatedResponse, PaginationSchema } from './pagination';

export const UserRoleSchema = Type.Union([
  Type.Literal('cashier'),
  Type.Literal('chef'),
  Type.Literal('admin'),
]);

export const UserStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('inactive'),
]);

export const UserSchema = StrictObject({
  user_id: Type.Number(),
  name: Type.String(),
  username: Type.String(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  created_at: Type.String({ format: 'date-time' }),
});

export const CreateUserSchema = StrictObject({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
  password: Type.String({ minLength: 6 }),
  role: Type.Optional(UserRoleSchema),
});

export const UpdateUserSchema = StrictObject({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  username: Type.Optional(Type.String({ minLength: 3, maxLength: 50 })),
  password: Type.Optional(Type.String({ minLength: 6 })),
  role: Type.Optional(UserRoleSchema),
  status: Type.Optional(UserStatusSchema),
});

export const UserListQuerySchema = PaginationSchema;

export const UserListResponseSchema = createPaginatedResponse(UserSchema);

export type User = Static<typeof UserSchema>;
export type CreateUserPayload = Static<typeof CreateUserSchema>;
export type UpdateUserPayload = Static<typeof UpdateUserSchema>;
export type UserListQuery = Static<typeof UserListQuerySchema>;
