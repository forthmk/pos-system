import { Kysely, sql } from 'kysely';

// Menu: categories, items, extras (addons), combos and their en / zh / ko names.
// docs/QuickBite-System-Design.docx §6.3 / §6.6.
//
// - Prices are VAT-inclusive selling prices (decimal(10,2)).
// - is_available = sold out today (kiosk greys it out, the server refuses it);
//   is_active = removed from the menu. Rows that orders point to are never
//   deleted, so menu_items / addons are RESTRICT from the order tables.
// - *_translations and menu_item_addons are pure child data → CASCADE.
// - categories.kds_station_id routes a category's items to a kitchen screen
//   (SET NULL: retiring a station sends them back to the default screen).
// - combo_components lists a combo's parts for the kitchen; the combo side
//   CASCADEs, the part side is RESTRICT (can't delete an item a combo uses).
export async function up(db: Kysely<any>) {
    await sql`
    CREATE TABLE IF NOT EXISTS \`categories\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`kds_station_id\` bigint DEFAULT NULL,
      \`code\` varchar(5) NOT NULL,
      \`name\` varchar(60) NOT NULL,
      \`sort_order\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_categories_store_name\` (\`store_id\`, \`name\`),
      UNIQUE KEY \`uq_categories_store_code\` (\`store_id\`, \`code\`),
      KEY \`idx_categories_kds_station\` (\`kds_station_id\`),
      CONSTRAINT \`fk_categories_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_categories_kds_station\` FOREIGN KEY (\`kds_station_id\`) REFERENCES \`kds_stations\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`category_translations\` (
      \`category_id\` bigint NOT NULL,
      \`lang\` enum('en','zh','ko') NOT NULL,
      \`name\` varchar(60) NOT NULL,
      PRIMARY KEY (\`category_id\`, \`lang\`),
      CONSTRAINT \`fk_category_translations_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`menu_items\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`category_id\` bigint NOT NULL,
      \`sku\` varchar(10) NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`description\` text,
      \`price\` decimal(10,2) NOT NULL,
      \`image_url\` varchar(255) DEFAULT NULL,
      \`is_combo\` tinyint(1) NOT NULL DEFAULT 0,
      \`is_bestseller\` tinyint(1) NOT NULL DEFAULT 0,
      \`is_available\` tinyint(1) NOT NULL DEFAULT 1,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`sort_order\` int NOT NULL DEFAULT 0,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_menu_items_sku\` (\`sku\`),
      KEY \`idx_menu_items_category\` (\`category_id\`, \`is_active\`, \`sort_order\`),
      CONSTRAINT \`fk_menu_items_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_menu_items_price\` CHECK (\`price\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`menu_item_translations\` (
      \`menu_item_id\` bigint NOT NULL,
      \`lang\` enum('en','zh','ko') NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`description\` text,
      PRIMARY KEY (\`menu_item_id\`, \`lang\`),
      CONSTRAINT \`fk_menu_item_translations_item\` FOREIGN KEY (\`menu_item_id\`) REFERENCES \`menu_items\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`addons\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`store_id\` bigint NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`price\` decimal(10,2) NOT NULL,
      \`image_url\` varchar(255) DEFAULT NULL,
      \`is_available\` tinyint(1) NOT NULL DEFAULT 1,
      \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_addons_store_name\` (\`store_id\`, \`name\`),
      CONSTRAINT \`fk_addons_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_addons_price\` CHECK (\`price\` >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`addon_translations\` (
      \`addon_id\` bigint NOT NULL,
      \`lang\` enum('en','zh','ko') NOT NULL,
      \`name\` varchar(120) NOT NULL,
      PRIMARY KEY (\`addon_id\`, \`lang\`),
      CONSTRAINT \`fk_addon_translations_addon\` FOREIGN KEY (\`addon_id\`) REFERENCES \`addons\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`menu_item_addons\` (
      \`menu_item_id\` bigint NOT NULL,
      \`addon_id\` bigint NOT NULL,
      \`price_override\` decimal(10,2) DEFAULT NULL,
      \`sort_order\` int NOT NULL DEFAULT 0,
      PRIMARY KEY (\`menu_item_id\`, \`addon_id\`),
      KEY \`idx_menu_item_addons_addon\` (\`addon_id\`),
      CONSTRAINT \`fk_menu_item_addons_item\` FOREIGN KEY (\`menu_item_id\`) REFERENCES \`menu_items\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_menu_item_addons_addon\` FOREIGN KEY (\`addon_id\`) REFERENCES \`addons\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);

    await sql`
    CREATE TABLE IF NOT EXISTS \`combo_components\` (
      \`combo_item_id\` bigint NOT NULL,
      \`component_item_id\` bigint NOT NULL,
      \`quantity\` int NOT NULL DEFAULT 1,
      PRIMARY KEY (\`combo_item_id\`, \`component_item_id\`),
      KEY \`idx_combo_components_component\` (\`component_item_id\`),
      CONSTRAINT \`fk_combo_components_combo\` FOREIGN KEY (\`combo_item_id\`) REFERENCES \`menu_items\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_combo_components_component\` FOREIGN KEY (\`component_item_id\`) REFERENCES \`menu_items\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`chk_combo_components_quantity\` CHECK (\`quantity\` >= 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `.execute(db);
}

export async function down(db: Kysely<any>) {
    await sql`DROP TABLE IF EXISTS \`combo_components\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`menu_item_addons\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`addon_translations\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`addons\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`menu_item_translations\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`menu_items\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`category_translations\``.execute(db);
    await sql`DROP TABLE IF EXISTS \`categories\``.execute(db);
}
