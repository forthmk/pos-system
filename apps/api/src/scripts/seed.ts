import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../services/database.service';

// Local / demo data: one store, its three screens, staff, settings, discount
// types and the menu from the UI references (prices match the mock-ups, e.g.
// 3× Double Smash Burger + 2× Sundae = ₱595). Runs only on an empty database.
//
// Dev logins (test values — change them on a real store):
//   admin   / admin123   (password)      manager / 1111 (PIN)
//   cashier / 2222 (PIN)                 chef    / 3333 (PIN)

type Names = { zh: string; ko: string };

const CATEGORIES: { code: string; name: string; t: Names }[] = [
    { code: 'C', name: 'Chicken', t: { zh: '炸鸡', ko: '치킨' } },
    { code: 'B', name: 'Burger', t: { zh: '汉堡', ko: '버거' } },
    { code: 'D', name: 'Dessert & Fries', t: { zh: '甜点和薯条', ko: '디저트 & 감자튀김' } },
    { code: 'R', name: 'Drinks', t: { zh: '饮料', ko: '음료' } },
    { code: 'M', name: 'Combos', t: { zh: '套餐', ko: '세트' } },
];

const ITEMS: { sku: string; cat: string; name: string; price: number; best?: boolean; combo?: boolean; t: Names }[] = [
    { sku: 'C1', cat: 'C', name: 'Crispy Drumsticks (2pc)', price: 145, t: { zh: '脆皮鸡腿（2块）', ko: '크리스피 드럼스틱 (2조각)' } },
    { sku: 'C2', cat: 'C', name: 'Spicy Buffalo Wings (6pc)', price: 185, t: { zh: '香辣水牛城鸡翅（6块）', ko: '매운 버팔로 윙 (6조각)' } },
    { sku: 'C3', cat: 'C', name: '4pc Family Chicken Box', price: 280, t: { zh: '家庭炸鸡桶（4块）', ko: '패밀리 치킨 박스 (4조각)' } },
    { sku: 'B1', cat: 'B', name: 'Double Smash Burger', price: 165, best: true, t: { zh: '双层压饼汉堡', ko: '더블 스매시 버거' } },
    { sku: 'B2', cat: 'B', name: 'Crispy Chicken Burger', price: 135, t: { zh: '脆皮鸡肉汉堡', ko: '크리스피 치킨 버거' } },
    { sku: 'B3', cat: 'B', name: 'Smoky Bacon Melt', price: 175, t: { zh: '烟熏培根芝士汉堡', ko: '스모키 베이컨 멜트' } },
    { sku: 'B4', cat: 'B', name: 'Classic Cheeseburger', price: 110, t: { zh: '经典芝士汉堡', ko: '클래식 치즈버거' } },
    { sku: 'B5', cat: 'B', name: 'Spicy Burger', price: 150, t: { zh: '香辣汉堡', ko: '스파이시 버거' } },
    { sku: 'D1', cat: 'D', name: 'Golden Crispy Fries', price: 65, t: { zh: '金黄脆薯条', ko: '골든 크리스피 감자튀김' } },
    { sku: 'D2', cat: 'D', name: 'Loaded Cheese Fries', price: 95, t: { zh: '芝士薯条', ko: '로디드 치즈 감자튀김' } },
    { sku: 'D3', cat: 'D', name: 'Strawberry Swirl Sundae', price: 50, t: { zh: '草莓圣代', ko: '딸기 스월 선데' } },
    { sku: 'D4', cat: 'D', name: 'Warm Choco Lava Pie', price: 55, t: { zh: '热巧克力熔岩派', ko: '따뜻한 초코 라바 파이' } },
    { sku: 'D5', cat: 'D', name: 'Vanilla Waffle Cone', price: 35, t: { zh: '香草华夫筒', ko: '바닐라 와플콘' } },
    { sku: 'D6', cat: 'D', name: 'Cinnamon Churro Bites', price: 75, t: { zh: '肉桂吉事果', ko: '시나몬 츄러스 바이트' } },
    { sku: 'R1', cat: 'R', name: 'Iced Cola Fizz', price: 45, t: { zh: '冰可乐', ko: '아이스 콜라' } },
    { sku: 'R2', cat: 'R', name: 'Tropical Mango Splash', price: 60, t: { zh: '热带芒果饮', ko: '트로피컬 망고 스플래시' } },
    { sku: 'R3', cat: 'R', name: 'Iced Caramel Latte', price: 85, t: { zh: '冰焦糖拿铁', ko: '아이스 카라멜 라떼' } },
    { sku: 'M1', cat: 'M', name: 'Double Smash Meal', price: 245, combo: true, t: { zh: '双层压饼汉堡套餐', ko: '더블 스매시 세트' } },
];

const ADDONS: { name: string; price: number; t: Names }[] = [
    { name: 'Crispy Fries (S)', price: 35, t: { zh: '小份薯条', ko: '감자튀김 (S)' } },
    { name: 'Mini Swirl Sundae', price: 45, t: { zh: '迷你圣代', ko: '미니 스월 선데' } },
    { name: 'Chilled Cola Fizz', price: 30, t: { zh: '冰镇可乐', ko: '시원한 콜라' } },
    { name: 'Warm Choco Pie', price: 40, t: { zh: '热巧克力派', ko: '따뜻한 초코 파이' } },
];
// Which items offer the extras (all four, in this order).
const ITEMS_WITH_EXTRAS = ['C1', 'C2', 'C3', 'B1', 'B2', 'B3', 'B4', 'B5', 'D1', 'D2', 'R1', 'R2', 'R3'];

const SETTINGS: Record<string, string> = {
    vat_rate: '0.12',
    senior_pwd_rate: '0.20',
    kds_delay_minutes: '5',
    kds_recall_minutes: '10',
    kds_auto_clear_minutes: '0',
    kiosk_idle_seconds: '60',
    kiosk_reset_seconds: '10',
    kiosk_online_payment: 'off',
    kiosk_payment_wait_seconds: '120',
    awaiting_payment_expiry_minutes: '30',
    languages: 'en,zh,ko',
    order_number_prefix: 'ORD-',
    order_number_digits: '6',
    receipt_paper: '58mm',
    slip_paper: '80mm',
    order_lock_minutes: '5',
    scan_max_key_gap_ms: '50',
};

const id = (r: { insertId?: bigint }) => Number(r.insertId);

async function main() {
    const existing = await db.selectFrom('stores').select('id').executeTakeFirst();
    if (existing) {
        console.log('Database already has a store — seed skipped (it only runs on an empty database).');
        return;
    }

    await db.transaction().execute(async (trx) => {
        const storeId = id(await trx.insertInto('stores').values({ code: '01', name: 'QuickBite #01' }).executeTakeFirstOrThrow());
        const stationId = id(await trx.insertInto('kds_stations').values({ store_id: storeId, code: 'EXPO-01', name: 'Expo Station 01' }).executeTakeFirstOrThrow());

        await trx
            .insertInto('terminals')
            .values([
                { store_id: storeId, code: 'KIOSK-01', type: 'kiosk', name: 'Self-service Kiosk 01' },
                { store_id: storeId, code: 'POS-01', type: 'pos', name: 'Cashier Register 01' },
                { store_id: storeId, code: 'EXPO-01', type: 'kds', name: 'Kitchen Display 01', kds_station_id: stationId },
            ])
            .execute();

        const hash = (s: string) => bcrypt.hashSync(s, 10);
        await trx
            .insertInto('users')
            .values([
                { store_id: storeId, username: 'admin', name: 'Store Admin', role: 'admin', pin_hash: hash('admin123') },
                { store_id: storeId, username: 'manager', name: 'Shift Manager', role: 'manager', pin_hash: hash('1111') },
                { store_id: storeId, username: 'cashier', name: 'Cashier One', role: 'cashier', pin_hash: hash('2222') },
                { store_id: storeId, username: 'chef', name: 'Chef One', role: 'chef', pin_hash: hash('3333') },
            ])
            .execute();

        await trx
            .insertInto('settings')
            .values(Object.entries(SETTINGS).map(([key, value]) => ({ store_id: storeId, key, value })))
            .execute();
        await trx.insertInto('order_sequences').values({ store_id: storeId, last_number: 0 }).execute();

        await trx
            .insertInto('discount_types')
            .values([
                { store_id: storeId, code: 'REGULAR', name: 'Regular Rate', kind: 'none', rate: '0', sort_order: 1 },
                { store_id: storeId, code: 'PWD', name: 'PWD', kind: 'senior_pwd', rate: '0.2', requires_id: 1, sort_order: 2 },
                { store_id: storeId, code: 'VOUCHER', name: 'Voucher', kind: 'voucher', rate: '0', sort_order: 3 },
                { store_id: storeId, code: 'STUDENT', name: 'Student', kind: 'percent', rate: '0.1', sort_order: 4 },
                { store_id: storeId, code: 'SENIOR', name: 'Senior', kind: 'senior_pwd', rate: '0.2', requires_id: 1, sort_order: 5 },
            ])
            .execute();

        const categoryIds: Record<string, number> = {};
        for (const [i, c] of CATEGORIES.entries()) {
            const cid = id(await trx.insertInto('categories').values({ store_id: storeId, code: c.code, name: c.name, sort_order: i + 1 }).executeTakeFirstOrThrow());
            categoryIds[c.code] = cid;
            await trx
                .insertInto('category_translations')
                .values([
                    { category_id: cid, lang: 'en', name: c.name },
                    { category_id: cid, lang: 'zh', name: c.t.zh },
                    { category_id: cid, lang: 'ko', name: c.t.ko },
                ])
                .execute();
        }

        const itemIds: Record<string, number> = {};
        for (const [i, it] of ITEMS.entries()) {
            const mid = id(
                await trx
                    .insertInto('menu_items')
                    .values({
                        category_id: categoryIds[it.cat],
                        sku: it.sku,
                        name: it.name,
                        price: it.price.toFixed(2),
                        is_bestseller: it.best ? 1 : 0,
                        is_combo: it.combo ? 1 : 0,
                        sort_order: i + 1,
                    })
                    .executeTakeFirstOrThrow(),
            );
            itemIds[it.sku] = mid;
            await trx
                .insertInto('menu_item_translations')
                .values([
                    { menu_item_id: mid, lang: 'en', name: it.name },
                    { menu_item_id: mid, lang: 'zh', name: it.t.zh },
                    { menu_item_id: mid, lang: 'ko', name: it.t.ko },
                ])
                .execute();
        }

        const addonIds: number[] = [];
        for (const a of ADDONS) {
            const aid = id(await trx.insertInto('addons').values({ store_id: storeId, name: a.name, price: a.price.toFixed(2) }).executeTakeFirstOrThrow());
            addonIds.push(aid);
            await trx
                .insertInto('addon_translations')
                .values([
                    { addon_id: aid, lang: 'en', name: a.name },
                    { addon_id: aid, lang: 'zh', name: a.t.zh },
                    { addon_id: aid, lang: 'ko', name: a.t.ko },
                ])
                .execute();
        }
        await trx
            .insertInto('menu_item_addons')
            .values(ITEMS_WITH_EXTRAS.flatMap((sku) => addonIds.map((addon_id, i) => ({ menu_item_id: itemIds[sku], addon_id, sort_order: i + 1 }))))
            .execute();

        await trx
            .insertInto('combo_components')
            .values(['B1', 'D1', 'R1'].map((sku) => ({ combo_item_id: itemIds.M1, component_item_id: itemIds[sku], quantity: 1 })))
            .execute();
    });

    console.log('Seeded: store 01, 3 terminals, 4 users, settings, 5 discount types, 5 categories, 18 items, 4 extras.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => process.exit());
