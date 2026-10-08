import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // 1. users
  await sql`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`user_id\`       int          NOT NULL AUTO_INCREMENT,
      \`name\`          varchar(100) NOT NULL,
      \`username\`      varchar(50)  NOT NULL,
      \`password_hash\` varchar(255) NOT NULL,
      \`role\`          enum('cashier','chef','admin') NOT NULL DEFAULT 'cashier',
      \`status\`        enum('active','inactive')      NOT NULL DEFAULT 'active',
      \`created_at\`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`user_id\`),
      UNIQUE KEY \`uq_users_username\` (\`username\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 2. restaurant_tables
  await sql`
    CREATE TABLE IF NOT EXISTS \`restaurant_tables\` (
      \`table_id\`      int  NOT NULL AUTO_INCREMENT,
      \`table_number\`  int  NOT NULL,
      \`capacity\`      int  NOT NULL DEFAULT 4,
      \`status\`        enum('available','occupied') NOT NULL DEFAULT 'available',
      PRIMARY KEY (\`table_id\`),
      UNIQUE KEY \`uq_table_number\` (\`table_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 3. categories
  await sql`
    CREATE TABLE IF NOT EXISTS \`categories\` (
      \`category_id\`  int          NOT NULL AUTO_INCREMENT,
      \`name\`         varchar(100) NOT NULL,
      \`description\`  text         DEFAULT NULL,
      PRIMARY KEY (\`category_id\`),
      UNIQUE KEY \`uq_categories_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 4. menu_items
  await sql`
    CREATE TABLE IF NOT EXISTS \`menu_items\` (
      \`menu_item_id\`  int            NOT NULL AUTO_INCREMENT,
      \`name\`          varchar(150)   NOT NULL,
      \`description\`   text           DEFAULT NULL,
      \`price\`         decimal(10,2)  NOT NULL,
      \`category_id\`   int            NOT NULL,
      \`image_url\`     varchar(500)   DEFAULT NULL,
      \`is_available\`  tinyint(1)     NOT NULL DEFAULT 1,
      PRIMARY KEY (\`menu_item_id\`),
      KEY \`fk_menu_items_category\` (\`category_id\`),
      CONSTRAINT \`fk_menu_items_category\`
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`category_id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 5. orders
  await sql`
    CREATE TABLE IF NOT EXISTS \`orders\` (
      \`order_id\`      int            NOT NULL AUTO_INCREMENT,
      \`user_id\`       int            NOT NULL,
      \`table_id\`      int            DEFAULT NULL,
      \`order_type\`    enum('dine-in','takeout') NOT NULL DEFAULT 'dine-in',
      \`status\`        enum('new','preparing','ready','completed','cancelled')
                         NOT NULL DEFAULT 'new',
      \`total_amount\`  decimal(10,2)  NOT NULL DEFAULT 0.00,
      \`created_at\`    datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`    datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`order_id\`),
      KEY \`fk_orders_user\`  (\`user_id\`),
      KEY \`fk_orders_table\` (\`table_id\`),
      CONSTRAINT \`fk_orders_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT \`fk_orders_table\`
        FOREIGN KEY (\`table_id\`) REFERENCES \`restaurant_tables\` (\`table_id\`)
        ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 6. order_items
  await sql`
    CREATE TABLE IF NOT EXISTS \`order_items\` (
      \`order_item_id\` int            NOT NULL AUTO_INCREMENT,
      \`order_id\`      int            NOT NULL,
      \`menu_item_id\`  int            NOT NULL,
      \`quantity\`      int            NOT NULL DEFAULT 1,
      \`unit_price\`    decimal(10,2)  NOT NULL,
      \`subtotal\`      decimal(10,2)  NOT NULL,
      \`notes\`         varchar(255)   DEFAULT NULL,
      \`status\`        enum('pending','preparing','ready','served')
                         NOT NULL DEFAULT 'pending',
      PRIMARY KEY (\`order_item_id\`),
      KEY \`fk_order_items_order\`     (\`order_id\`),
      KEY \`fk_order_items_menu_item\` (\`menu_item_id\`),
      CONSTRAINT \`fk_order_items_order\`
        FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`order_id\`)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT \`fk_order_items_menu_item\`
        FOREIGN KEY (\`menu_item_id\`) REFERENCES \`menu_items\` (\`menu_item_id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 7. payments
  await sql`
    CREATE TABLE IF NOT EXISTS \`payments\` (
      \`payment_id\`      int            NOT NULL AUTO_INCREMENT,
      \`order_id\`        int            NOT NULL,
      \`method\`          enum('cash','card','online') NOT NULL,
      \`amount\`          decimal(10,2)  NOT NULL,
      \`payment_status\`  enum('pending','completed','refunded')
                           NOT NULL DEFAULT 'pending',
      \`transaction_ref\` varchar(100)   DEFAULT NULL,
      \`paid_at\`         datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`payment_id\`),
      KEY \`fk_payments_order\` (\`order_id\`),
      CONSTRAINT \`fk_payments_order\`
        FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`order_id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 8. inventory
  await sql`
    CREATE TABLE IF NOT EXISTS \`inventory\` (
      \`inventory_id\`  int            NOT NULL AUTO_INCREMENT,
      \`menu_item_id\`  int            NOT NULL,
      \`stock_qty\`     decimal(10,2)  NOT NULL DEFAULT 0.00,
      \`unit\`          varchar(30)    NOT NULL DEFAULT 'pcs',
      \`min_stock\`     decimal(10,2)  NOT NULL DEFAULT 0.00,
      \`updated_at\`    datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`inventory_id\`),
      UNIQUE KEY \`uq_inventory_menu_item\` (\`menu_item_id\`),
      CONSTRAINT \`fk_inventory_menu_item\`
        FOREIGN KEY (\`menu_item_id\`) REFERENCES \`menu_items\` (\`menu_item_id\`)
        ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  // 9. order_status_log
  await sql`
    CREATE TABLE IF NOT EXISTS \`order_status_log\` (
      \`log_id\`      int      NOT NULL AUTO_INCREMENT,
      \`order_id\`    int      NOT NULL,
      \`status\`      enum('new','preparing','ready','completed','cancelled') NOT NULL,
      \`changed_by\`  int      NOT NULL,
      \`changed_at\`  datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`log_id\`),
      KEY \`fk_status_log_order\`      (\`order_id\`),
      KEY \`fk_status_log_changed_by\` (\`changed_by\`),
      CONSTRAINT \`fk_status_log_order\`
        FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`order_id\`)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT \`fk_status_log_changed_by\`
        FOREIGN KEY (\`changed_by\`) REFERENCES \`users\` (\`user_id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);
}

export async function down(db: Kysely<any>) {
  // Drop in reverse FK dependency order
  await sql`DROP TABLE IF EXISTS \`order_status_log\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`inventory\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`payments\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`order_items\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`orders\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`menu_items\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`categories\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`restaurant_tables\``.execute(db);
  await sql`DROP TABLE IF EXISTS \`users\``.execute(db);
}
