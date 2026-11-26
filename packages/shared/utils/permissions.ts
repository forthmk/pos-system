// Who may do what — the single source of truth for the API's checkPermission
// preHandler and the web's usePermission hook (design §2.2).
//
// Staff sign in with a PIN and act as their role. Kiosk and KDS screens sign
// in with a device token and act as their terminal type. Roles are fixed (no
// per-user editor): a new rule is a new key here.

export const ROLES = ['admin', 'manager', 'cashier', 'chef'] as const;
export type Role = (typeof ROLES)[number];

export const DEVICE_TYPES = ['kiosk', 'kds'] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

/** Anyone who can call the API: a staff role or a signed-in screen. */
export type Actor = Role | DeviceType;

const STAFF: readonly Actor[] = ['admin', 'manager', 'cashier', 'chef'];
const COUNTER: readonly Actor[] = ['admin', 'manager', 'cashier'];
const MANAGERS: readonly Actor[] = ['admin', 'manager'];
const ADMIN: readonly Actor[] = ['admin'];

export const PERMISSIONS = {
    'menu.view': [...STAFF, 'kiosk'],
    'menu.edit': ADMIN,
    'menu.availability': COUNTER, // sold out / back in
    'orders.create': [...COUNTER, 'kiosk'],
    'orders.board': [...STAFF, 'kiosk', 'kds'], // Preparing / Ready numbers
    'orders.settle': COUNTER, // scan a slip, take payment
    'orders.cancel': COUNTER,
    'orders.void': MANAGERS,
    'kds.use': ['admin', 'manager', 'chef', 'kds'],
    'shifts.use': COUNTER,
    'reports.view': COUNTER,
    'reports.export': MANAGERS,
    'vouchers.manage': MANAGERS,
    'users.manage': ADMIN,
    'terminals.manage': ADMIN,
    'settings.manage': ADMIN,
} as const satisfies Record<string, readonly Actor[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (actor: Actor | null | undefined, permission: Permission): boolean =>
    !!actor && (PERMISSIONS[permission] as readonly Actor[]).includes(actor);
