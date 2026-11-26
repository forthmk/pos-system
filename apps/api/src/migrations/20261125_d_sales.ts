import { Kysely, sql } from 'kysely';

// Sales: shifts, orders and everything hanging off an order, plus Z-readings.
// docs/QuickBite-System-Design.docx §6.4–6.7, statuses §4.4, slip barcode §7.11.
//
// - Sales history is never deleted: every FK into an order table is RESTRICT
//   (orders are cancelled / voided instead). The only CASCADE is
//   order_item_addons → order_items (pure child rows of a line).
// - order_items / order_item_addons copy the name and price at the moment of
//   sale (snapshot), so old receipts and Z-readings never change.
// - orders.client_ref is UNIQUE: a retried / double-tapped request returns the
//   saved order instead of creating a second one.
// - orders.slip_token + UNIQUE (store_id, order_number) serve the kiosk slip
//   scan (store + number + slip code). locked_by_terminal_id / locked_at stop
//   two registers charging the same slip (SET NULL if a terminal is removed).
// - One discount per order: UNIQUE (order_id) on order_discounts.
// - One Z-reading per shift, numbered per terminal.
export async function up(db: Kysely<any>) {
    await sql`
    CREATE TABLE IF NOT EXISTS \`shifts\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`terminal_id\` bigint NOT NULL,
      \`cashier_id\` bigint NOT NULL,
      \`status\` enum('open','closed') NOT NULL DEFAULT 'open',
      \`opened_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`closed_at\` datetime DEFAULT NULL,
      \`opening_cash\` decimal(10,2) NOT NULL DEFAULT 0,
      \`expected_cash\` decimal(10,2) DEFAULT NULL,
      \`counted_cash\` decimal(10,2) DEFAULT NULL,
      \`over_short\` decimal(10,2) DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_shifts_terminal_status\` (\`terminal_id\`, \`status\`),
      KEY \`idx_shifts_store\` (\`store_id\`),
      KEY \`idx_shifts_cashier\` (\`cashier_id\`),
      CONSTRAINT \`fk_shifts_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_shifts_terminal\` FOREIGN KEY (\`terminal_id\`) REFERENCES \`terminals\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_shifts_cashier\` FOREIGN KEY (\`cashier_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_shifts_opening_cash\` CHECK (\`opening_cash\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`terminal_id\` bigint NOT NULL,
      \`shift_id\` bigint DEFAULT NULL,
      \`cashier_id\` bigint DEFAULT NULL,
      \`client_ref\` char(36) NOT NULL,
      \`order_number\` bigint NOT NULL,
      \`order_no\` varchar(20) NOT NULL,
      \`source\` enum('kiosk','pos') NOT NULL,
      \`dining_mode\` enum('IN','OUT') NOT NULL,
      \`table_no\` varchar(10) DEFAULT NULL,
      \`language\` enum('en','zh','ko') NOT NULL DEFAULT 'en',
      \`status\` enum('awaiting_payment','preparing','completed','cancelled','voided') NOT NULL DEFAULT 'awaiting_payment',
      \`payment_method\` enum('gcash','cash','card') NOT NULL,
      \`item_count\` int NOT NULL DEFAULT 0,
      \`subtotal\` decimal(10,2) NOT NULL DEFAULT 0,
      \`discount_total\` decimal(10,2) NOT NULL DEFAULT 0,
      \`vatable_sales\` decimal(10,2) NOT NULL DEFAULT 0,
      \`vat_amount\` decimal(10,2) NOT NULL DEFAULT 0,
      \`vat_exempt_sales\` decimal(10,2) NOT NULL DEFAULT 0,
      \`total_due\` decimal(10,2) NOT NULL DEFAULT 0,
      \`slip_token\` char(3) DEFAULT NULL,
      \`slip_printed_at\` datetime DEFAULT NULL,
      \`locked_by_terminal_id\` bigint DEFAULT NULL,
      \`locked_at\` datetime DEFAULT NULL,
      \`placed_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`paid_at\` datetime DEFAULT NULL,
      \`sent_to_kitchen_at\` datetime DEFAULT NULL,
      \`completed_at\` datetime DEFAULT NULL,
      \`cleared_at\` datetime DEFAULT NULL,
      \`cancelled_at\` datetime DEFAULT NULL,
      \`voided_at\` datetime DEFAULT NULL,
      \`voided_by\` bigint DEFAULT NULL,
      \`void_reason\` varchar(255) DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_orders_client_ref\` (\`client_ref\`),
      UNIQUE KEY \`uq_orders_store_number\` (\`store_id\`, \`order_number\`),
      KEY \`idx_orders_order_no\` (\`order_no\`),
      KEY \`idx_orders_kds\` (\`store_id\`, \`status\`, \`sent_to_kitchen_at\`),
      KEY \`idx_orders_shift\` (\`shift_id\`),
      KEY \`idx_orders_placed_at\` (\`placed_at\`),
      KEY \`idx_orders_terminal\` (\`terminal_id\`),
      KEY \`idx_orders_cashier\` (\`cashier_id\`),
      KEY \`idx_orders_voided_by\` (\`voided_by\`),
      KEY \`idx_orders_locked_by\` (\`locked_by_terminal_id\`),
      CONSTRAINT \`fk_orders_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_orders_terminal\` FOREIGN KEY (\`terminal_id\`) REFERENCES \`terminals\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_orders_shift\` FOREIGN KEY (\`shift_id\`) REFERENCES \`shifts\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_orders_cashier\` FOREIGN KEY (\`cashier_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_orders_voided_by\` FOREIGN KEY (\`voided_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_orders_locked_by\` FOREIGN KEY (\`locked_by_terminal_id\`) REFERENCES \`terminals\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`chk_orders_amounts\` CHECK (\`subtotal\` >= 0 AND \`discount_total\` >= 0 AND \`total_due\` >= 0 AND \`item_count\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`order_items\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_id\` bigint NOT NULL,
      \`menu_item_id\` bigint NOT NULL,
      \`kds_station_id\` bigint DEFAULT NULL,
      \`sku\` varchar(10) NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`unit_price\` decimal(10,2) NOT NULL,
      \`addons_total\` decimal(10,2) NOT NULL DEFAULT 0,
      \`quantity\` int NOT NULL,
      \`line_total\` decimal(10,2) NOT NULL,
      \`note\` varchar(120) DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_order_items_order\` (\`order_id\`),
      KEY \`idx_order_items_menu_item\` (\`menu_item_id\`),
      KEY \`idx_order_items_kds_station\` (\`kds_station_id\`),
      CONSTRAINT \`fk_order_items_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_items_menu_item\` FOREIGN KEY (\`menu_item_id\`) REFERENCES \`menu_items\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_items_kds_station\` FOREIGN KEY (\`kds_station_id\`) REFERENCES \`kds_stations\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`chk_order_items_quantity\` CHECK (\`quantity\` BETWEEN 1 AND 99),
      CONSTRAINT \`chk_order_items_amounts\` CHECK (\`unit_price\` >= 0 AND \`addons_total\` >= 0 AND \`line_total\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`order_item_addons\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_item_id\` bigint NOT NULL,
      \`addon_id\` bigint NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`price\` decimal(10,2) NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_order_item_addons_item\` (\`order_item_id\`),
      KEY \`idx_order_item_addons_addon\` (\`addon_id\`),
      CONSTRAINT \`fk_order_item_addons_item\` FOREIGN KEY (\`order_item_id\`) REFERENCES \`order_items\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_item_addons_addon\` FOREIGN KEY (\`addon_id\`) REFERENCES \`addons\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_order_item_addons_price\` CHECK (\`price\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`order_discounts\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_id\` bigint NOT NULL,
      \`discount_type_id\` bigint NOT NULL,
      \`voucher_id\` bigint DEFAULT NULL,
      \`rate\` decimal(5,4) NOT NULL DEFAULT 0,
      \`base_amount\` decimal(10,2) NOT NULL DEFAULT 0,
      \`vat_removed\` decimal(10,2) NOT NULL DEFAULT 0,
      \`amount\` decimal(10,2) NOT NULL DEFAULT 0,
      \`id_number\` varchar(40) DEFAULT NULL,
      \`holder_name\` varchar(120) DEFAULT NULL,
      \`diners\` int NOT NULL DEFAULT 1,
      \`qualified\` int NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_order_discounts_order\` (\`order_id\`),
      KEY \`idx_order_discounts_type\` (\`discount_type_id\`),
      KEY \`idx_order_discounts_voucher\` (\`voucher_id\`),
      CONSTRAINT \`fk_order_discounts_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_discounts_type\` FOREIGN KEY (\`discount_type_id\`) REFERENCES \`discount_types\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_discounts_voucher\` FOREIGN KEY (\`voucher_id\`) REFERENCES \`vouchers\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_order_discounts_diners\` CHECK (\`diners\` >= 1 AND \`qualified\` >= 1 AND \`qualified\` <= \`diners\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`payments\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_id\` bigint NOT NULL,
      \`shift_id\` bigint DEFAULT NULL,
      \`terminal_id\` bigint NOT NULL,
      \`received_by\` bigint DEFAULT NULL,
      \`method\` enum('gcash','cash','card') NOT NULL,
      \`amount\` decimal(10,2) NOT NULL,
      \`tendered\` decimal(10,2) DEFAULT NULL,
      \`change_due\` decimal(10,2) DEFAULT NULL,
      \`reference_no\` varchar(60) DEFAULT NULL,
      \`provider_txn_id\` varchar(80) DEFAULT NULL,
      \`status\` enum('pending','settled','failed','refunded') NOT NULL DEFAULT 'pending',
      \`settled_at\` datetime DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_payments_order\` (\`order_id\`),
      KEY \`idx_payments_shift_method\` (\`shift_id\`, \`method\`, \`status\`),
      KEY \`idx_payments_terminal\` (\`terminal_id\`),
      KEY \`idx_payments_received_by\` (\`received_by\`),
      CONSTRAINT \`fk_payments_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_payments_shift\` FOREIGN KEY (\`shift_id\`) REFERENCES \`shifts\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_payments_terminal\` FOREIGN KEY (\`terminal_id\`) REFERENCES \`terminals\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_payments_received_by\` FOREIGN KEY (\`received_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_payments_amount\` CHECK (\`amount\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`order_status_events\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_id\` bigint NOT NULL,
      \`event_type\` enum('status','slip_printed','scanned','edited') NOT NULL DEFAULT 'status',
      \`from_status\` varchar(20) DEFAULT NULL,
      \`to_status\` varchar(20) DEFAULT NULL,
      \`actor_type\` enum('kiosk','cashier','chef','manager','system') NOT NULL,
      \`user_id\` bigint DEFAULT NULL,
      \`terminal_id\` bigint DEFAULT NULL,
      \`note\` varchar(255) DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_order_status_events_order\` (\`order_id\`, \`created_at\`),
      KEY \`idx_order_status_events_user\` (\`user_id\`),
      KEY \`idx_order_status_events_terminal\` (\`terminal_id\`),
      CONSTRAINT \`fk_order_status_events_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_status_events_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_order_status_events_terminal\` FOREIGN KEY (\`terminal_id\`) REFERENCES \`terminals\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`z_readings\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`shift_id\` bigint NOT NULL,
      \`terminal_id\` bigint NOT NULL,
      \`z_number\` int NOT NULL,
      \`period_from\` datetime NOT NULL,
      \`period_to\` datetime NOT NULL,
      \`transactions\` int NOT NULL DEFAULT 0,
      \`in_count\` int NOT NULL DEFAULT 0,
      \`out_count\` int NOT NULL DEFAULT 0,
      \`items_sold\` int NOT NULL DEFAULT 0,
      \`gross_sales\` decimal(12,2) NOT NULL DEFAULT 0,
      \`discount_total\` decimal(12,2) NOT NULL DEFAULT 0,
      \`net_sales\` decimal(12,2) NOT NULL DEFAULT 0,
      \`vatable_sales\` decimal(12,2) NOT NULL DEFAULT 0,
      \`vat_amount\` decimal(12,2) NOT NULL DEFAULT 0,
      \`vat_exempt_sales\` decimal(12,2) NOT NULL DEFAULT 0,
      \`cash_total\` decimal(12,2) NOT NULL DEFAULT 0,
      \`gcash_total\` decimal(12,2) NOT NULL DEFAULT 0,
      \`card_total\` decimal(12,2) NOT NULL DEFAULT 0,
      \`voids_count\` int NOT NULL DEFAULT 0,
      \`voids_amount\` decimal(12,2) NOT NULL DEFAULT 0,
      \`refunds_amount\` decimal(12,2) NOT NULL DEFAULT 0,
      \`first_order_no\` varchar(20) DEFAULT NULL,
      \`last_order_no\` varchar(20) DEFAULT NULL,
      \`grand_total_start\` decimal(14,2) NOT NULL DEFAULT 0,
      \`grand_total_end\` decimal(14,2) NOT NULL DEFAULT 0,
      \`generated_by\` bigint NOT NULL,
      \`generated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_z_readings_shift\` (\`shift_id\`),
      UNIQUE KEY \`uq_z_readings_terminal_number\` (\`terminal_id\`, \`z_number\`),
      KEY \`idx_z_readings_generated_by\` (\`generated_by\`),
      CONSTRAINT \`fk_z_readings_shift\` FOREIGN KEY (\`shift_id\`) REFERENCES \`shifts\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_z_readings_terminal\` FOREIGN KEY (\`terminal_id\`) REFERENCES \`terminals\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_z_readings_generated_by\` FOREIGN KEY (\`generated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);
}

export async function down(db: Kysely<any>) {
    await sql`DROP TABLE IF EXISTS \`z_readings\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`order_status_events\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`payments\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`order_discounts\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`order_item_addons\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`order_items\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`orders\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`shifts\``.execute(db);
}
