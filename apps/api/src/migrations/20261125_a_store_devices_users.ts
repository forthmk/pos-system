import { Kysely, sql } from 'kysely';

// Store, devices and staff — the tables every other table hangs off.
// docs/QuickBite-System-Design.docx §6.2 / §6.6.
//
// - stores: one row per branch (QuickBite #01). RESTRICT everywhere below —
//   a store with sales history can never be deleted, only is_active = 0.
// - kds_stations / terminals: every physical screen. A KDS terminal points at
//   the station whose tickets it shows (SET NULL so retiring a station doesn't
//   block deleting it; the terminal just stops showing tickets).
//   device_token_hash keeps kiosks / KDS signed in without a typed password.
// - users: staff. pin_hash holds bcrypt of the PIN (password for admins).
// - settings: key/value per store (CASCADE: pure child data of the store).
// - order_sequences: the running order number per store, locked with
//   SELECT … FOR UPDATE inside the order transaction (1 : 1 with stores).
export async function up(db: Kysely<any>) {
    await sql`
    CREATE TABLE IF NOT EXISTS \`stores\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`code\` varchar(20) NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`tin\` varchar(30) DEFAULT NULL,
      \`address\` varchar(255) DEFAULT NULL,
      \`vat_registered\` tinyint(1) NOT NULL DEFAULT 1,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_stores_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`kds_stations\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`code\` varchar(20) NOT NULL,
      \`name\` varchar(60) NOT NULL,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_kds_stations_store_code\` (\`store_id\`, \`code\`),
      CONSTRAINT \`fk_kds_stations_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`terminals\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`kds_station_id\` bigint DEFAULT NULL,
      \`code\` varchar(20) NOT NULL,
      \`type\` enum('kiosk','pos','kds') NOT NULL,
      \`name\` varchar(60) NOT NULL,
      \`device_token_hash\` varchar(255) DEFAULT NULL,
      \`last_seen_at\` datetime DEFAULT NULL,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_terminals_store_code\` (\`store_id\`, \`code\`),
      KEY \`idx_terminals_kds_station\` (\`kds_station_id\`),
      CONSTRAINT \`fk_terminals_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_terminals_kds_station\` FOREIGN KEY (\`kds_station_id\`) REFERENCES \`kds_stations\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`username\` varchar(60) NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`pin_hash\` varchar(255) NOT NULL,
      \`role\` enum('admin','manager','cashier','chef') NOT NULL,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`last_login_at\` datetime DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_users_username\` (\`username\`),
      KEY \`idx_users_store\` (\`store_id\`),
      CONSTRAINT \`fk_users_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`settings\` (
      \`store_id\` bigint NOT NULL,
      \`key\` varchar(60) NOT NULL,
      \`value\` varchar(255) NOT NULL,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`store_id\`, \`key\`),
      CONSTRAINT \`fk_settings_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`order_sequences\` (
      \`store_id\` bigint NOT NULL,
      \`last_number\` bigint NOT NULL DEFAULT 0,
      PRIMARY KEY (\`store_id\`),
      CONSTRAINT \`fk_order_sequences_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);
}

export async function down(db: Kysely<any>) {
    await sql`DROP TABLE IF EXISTS \`order_sequences\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`settings\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`users\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`terminals\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`kds_stations\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`stores\``.execute(db);
}
