import type { FastifyInstance } from 'fastify';
import * as controller from './admin.controller';
import * as schema from './admin.schema';

// Admin setup (design §8.1 /api/admin/*) — see README.md. Every route needs
// its permission (packages/shared/utils/permissions.ts): admins for menu,
// staff, screens and settings; managers too for vouchers.
async function routes(fastify: FastifyInstance) {
    const can = fastify.checkPermission;
    const menu = [can('menu.edit')];
    const settings = [can('settings.manage')];
    const vouchers = [can('vouchers.manage')];
    const users = [can('users.manage')];
    const screens = [can('terminals.manage')];

    fastify.get('/menu', { preHandler: menu, handler: controller.menu });
    fastify.post('/categories', { schema: schema.createCategory, preHandler: menu, handler: controller.createCategory });
    fastify.put('/categories/:id', { schema: schema.updateCategory, preHandler: menu, handler: controller.updateCategory });
    fastify.post('/items', { schema: schema.createItem, preHandler: menu, handler: controller.createItem });
    fastify.put('/items/:id', { schema: schema.updateItem, preHandler: menu, handler: controller.updateItem });
    fastify.post('/addons', { schema: schema.createAddon, preHandler: menu, handler: controller.createAddon });
    fastify.put('/addons/:id', { schema: schema.updateAddon, preHandler: menu, handler: controller.updateAddon });

    fastify.get('/discount-types', { preHandler: settings, handler: controller.discountTypes });
    fastify.put('/discount-types/:id', { schema: schema.updateDiscountType, preHandler: settings, handler: controller.updateDiscountType });
    fastify.get('/vouchers', { preHandler: vouchers, handler: controller.vouchers });
    fastify.post('/vouchers', { schema: schema.createVoucher, preHandler: vouchers, handler: controller.createVoucher });
    fastify.put('/vouchers/:id', { schema: schema.updateVoucher, preHandler: vouchers, handler: controller.updateVoucher });

    fastify.get('/users', { preHandler: users, handler: controller.users });
    fastify.post('/users', { schema: schema.createUser, preHandler: users, handler: controller.createUser });
    fastify.put('/users/:id', { schema: schema.updateUser, preHandler: users, handler: controller.updateUser });

    fastify.get('/terminals', { preHandler: screens, handler: controller.terminals });
    fastify.post('/terminals', { schema: schema.createTerminal, preHandler: screens, handler: controller.createTerminal });
    fastify.put('/terminals/:id', { schema: schema.updateTerminal, preHandler: screens, handler: controller.updateTerminal });
    fastify.post('/terminals/:id/unpair', { schema: schema.byId, preHandler: screens, handler: controller.unpairTerminal });
    fastify.get('/stations', { preHandler: screens, handler: controller.stations });
    fastify.post('/stations', { schema: schema.createStation, preHandler: screens, handler: controller.createStation });
    fastify.put('/stations/:id', { schema: schema.updateStation, preHandler: screens, handler: controller.updateStation });

    fastify.get('/settings', { preHandler: settings, handler: controller.settings });
    fastify.put('/settings', { schema: schema.saveSettings, preHandler: settings, handler: controller.saveSettings });
}

export default routes;
