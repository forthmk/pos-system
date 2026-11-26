import { Kysely, sql } from 'kysely';

// Discount types (Regular, Student, Senior, PWD, Voucher) and voucher codes.
// docs/QuickBite-System-Design.docx §6.5, formulas in §7.6.
//
// - discount_types.kind decides the formula: none | percent | senior_pwd
//   (remove 12% VAT, then rate) | voucher (rate comes from the voucher row).
// - Both tables are referenced by order_discounts with RESTRICT — a discount
//   used on a sale is switched off (is_active = 0), never deleted.
export async function up(db: Kysely<any>) {
    await sql`
    CREATE TABLE IF NOT EXISTS \`discount_types\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`code\` varchar(20) NOT NULL,
      \`name\` varchar(60) NOT NULL,
      \`kind\` enum('none','percent','senior_pwd','voucher') NOT NULL,
      \`rate\` decimal(5,4) NOT NULL DEFAULT 0,
      \`requires_id\` tinyint(1) NOT NULL DEFAULT 0,
      \`sort_order\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_discount_types_store_code\` (\`store_id\`, \`code\`),
      CONSTRAINT \`fk_discount_types_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_discount_types_rate\` CHECK (\`rate\` >= 0 AND \`rate\` <= 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`vouchers\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`code\` varchar(40) NOT NULL,
      \`kind\` enum('percent','fixed') NOT NULL,
      \`value\` decimal(10,2) NOT NULL,
      \`min_spend\` decimal(10,2) NOT NULL DEFAULT 0,
      \`valid_from\` datetime DEFAULT NULL,
      \`valid_to\` datetime DEFAULT NULL,
      \`max_uses\` int DEFAULT NULL,
      \`used_count\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_vouchers_store_code\` (\`store_id\`, \`code\`),
      CONSTRAINT \`fk_vouchers_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_vouchers_value\` CHECK (\`value\` > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);
}

export async function down(db: Kysely<any>) {
    await sql`DROP TABLE IF EXISTS \`vouchers\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`discount_types\``.execute(db);
}
