import { Type, TProperties } from '@sinclair/typebox';

export const StrictObject = <T extends TProperties>(properties: T) =>
  Type.Object(properties, { additionalProperties: false });
