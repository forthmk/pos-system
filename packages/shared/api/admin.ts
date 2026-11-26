// adminApi — setup screens (backend: apps/api/src/modules/admin). Device
// pairing stays in authApi (terminals, pairTerminal).
import { createApi } from '../axios';
import type {
    AddonBody,
    AdminMenu,
    CategoryBody,
    CreateTerminalBody,
    CreateUserBody,
    DiscountTypeBody,
    DiscountTypeRow,
    ItemBody,
    KdsStationRow,
    SettingsBody,
    StationBody,
    StoreSettings,
    TerminalRow,
    UpdateTerminalBody,
    UpdateUserBody,
    UserRow,
    VoucherBody,
    VoucherRow,
} from '../model';
const { get, post, put } = createApi();
type Saved = { id: number };

export const adminApi = {
    menu: () => get<AdminMenu>('/admin/menu'),
    createCategory: (body: CategoryBody) => post<Saved>('/admin/categories', body),
    updateCategory: (id: number, body: CategoryBody) => put<Saved>(`/admin/categories/${id}`, body),
    createItem: (body: ItemBody) => post<Saved>('/admin/items', body),
    updateItem: (id: number, body: ItemBody) => put<Saved>(`/admin/items/${id}`, body),
    createAddon: (body: AddonBody) => post<Saved>('/admin/addons', body),
    updateAddon: (id: number, body: AddonBody) => put<Saved>(`/admin/addons/${id}`, body),

    discountTypes: () => get<DiscountTypeRow[]>('/admin/discount-types'),
    updateDiscountType: (id: number, body: DiscountTypeBody) => put<Saved>(`/admin/discount-types/${id}`, body),
    vouchers: () => get<VoucherRow[]>('/admin/vouchers'),
    createVoucher: (body: VoucherBody) => post<Saved>('/admin/vouchers', body),
    updateVoucher: (id: number, body: VoucherBody) => put<Saved>(`/admin/vouchers/${id}`, body),

    users: () => get<UserRow[]>('/admin/users'),
    createUser: (body: CreateUserBody) => post<Saved>('/admin/users', body),
    updateUser: (id: number, body: UpdateUserBody) => put<Saved>(`/admin/users/${id}`, body),

    terminals: () => get<TerminalRow[]>('/admin/terminals'),
    createTerminal: (body: CreateTerminalBody) => post<Saved>('/admin/terminals', body),
    updateTerminal: (id: number, body: UpdateTerminalBody) => put<Saved>(`/admin/terminals/${id}`, body),
    unpairTerminal: (id: number) => post<{ id: number; paired: false }>(`/admin/terminals/${id}/unpair`),
    stations: () => get<KdsStationRow[]>('/admin/stations'),
    createStation: (body: StationBody) => post<Saved>('/admin/stations', body),
    updateStation: (id: number, body: StationBody) => put<Saved>(`/admin/stations/${id}`, body),

    settings: () => get<StoreSettings>('/admin/settings'),
    saveSettings: (body: SettingsBody) => put<StoreSettings>('/admin/settings', body),
};
