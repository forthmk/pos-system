import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './admin.service';

// Admin setup — thin handlers: store id from the signed-in admin, body from
// the schema, the rules in admin.service. Create → 201, update → 200.

type Req = FastifyRequest<{ Params: { id: number }; Body: any }>;
const store = (r: FastifyRequest) => r.principal!.store_id;

const read = (fn: (storeId: number) => Promise<unknown>) => async (r: FastifyRequest, reply: FastifyReply) => sendResult(reply, await fn(store(r)));
const create = (fn: (storeId: number, body: any) => Promise<unknown>) => async (r: Req, reply: FastifyReply) => sendResult(reply, await fn(store(r), r.body), 201);
const update = (fn: (storeId: number, id: number, body: any) => Promise<unknown>) => async (r: Req, reply: FastifyReply) =>
    sendResult(reply, await fn(store(r), r.params.id, r.body));

// menu
export const menu = read(service.readMenu);
export const createCategory = create((s, b) => service.saveCategory(s, null, b));
export const updateCategory = update(service.saveCategory);
export const createItem = create((s, b) => service.saveItem(s, null, b));
export const updateItem = update(service.saveItem);
export const createAddon = create((s, b) => service.saveAddon(s, null, b));
export const updateAddon = update(service.saveAddon);

// discounts, vouchers
export const discountTypes = read(service.listDiscountTypes);
export const updateDiscountType = update(service.updateDiscountType);
export const vouchers = read(service.listVouchers);
export const createVoucher = create((s, b) => service.saveVoucher(s, null, b));
export const updateVoucher = update(service.saveVoucher);

// staff — updating needs who is asking (no switching yourself off)
export const users = read(service.listUsers);
export const createUser = create(service.createUser);
export const updateUser = async (r: Req, reply: FastifyReply) => sendResult(reply, await service.updateUser(r.principal!, r.params.id, r.body as never));

// screens
export const terminals = read(service.listTerminals);
export const createTerminal = create(service.createTerminal);
export const updateTerminal = update(service.updateTerminal);
export const unpairTerminal = async (r: Req, reply: FastifyReply) => sendResult(reply, await service.unpairTerminal(store(r), r.params.id));
export const stations = read(service.listStations);
export const createStation = create((s, b) => service.saveStation(s, null, b));
export const updateStation = update(service.saveStation);

// settings
export const settings = read(service.readSettings);
export const saveSettings = async (r: Req, reply: FastifyReply) => sendResult(reply, await service.saveSettings(store(r), r.body as never));
