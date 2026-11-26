import { Type } from '@sinclair/typebox';
import {
    AddonBodySchema,
    CategoryBodySchema,
    CreateTerminalBodySchema,
    CreateUserBodySchema,
    DiscountTypeBodySchema,
    ItemBodySchema,
    SettingsBodySchema,
    StationBodySchema,
    UpdateTerminalBodySchema,
    UpdateUserBodySchema,
    VoucherBodySchema,
} from '@pos-system/shared';

const params = Type.Object({ id: Type.Integer({ minimum: 1 }) });
const create = <T>(body: T) => ({ body });
const update = <T>(body: T) => ({ params, body });

export const byId = { params };
export const createCategory = create(CategoryBodySchema);
export const updateCategory = update(CategoryBodySchema);
export const createItem = create(ItemBodySchema);
export const updateItem = update(ItemBodySchema);
export const createAddon = create(AddonBodySchema);
export const updateAddon = update(AddonBodySchema);
export const updateDiscountType = update(DiscountTypeBodySchema);
export const createVoucher = create(VoucherBodySchema);
export const updateVoucher = update(VoucherBodySchema);
export const createUser = create(CreateUserBodySchema);
export const updateUser = update(UpdateUserBodySchema);
export const createTerminal = create(CreateTerminalBodySchema);
export const updateTerminal = update(UpdateTerminalBodySchema);
export const createStation = create(StationBodySchema);
export const updateStation = update(StationBodySchema);
export const saveSettings = create(SettingsBodySchema);
