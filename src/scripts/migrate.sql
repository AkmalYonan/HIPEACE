-- =============================================================
-- HIPEACE BOT - Database Migration Script
-- Run this file via phpMyAdmin / MySQL CLI on database: testing_1
-- =============================================================

-- -------------------------------------------------------------
-- 1. DROP old bot_settings if exists (redesign for multi-type)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS bot_settings;

CREATE TABLE bot_settings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  guild_id    VARCHAR(30)  NOT NULL,
  type        VARCHAR(50)  NOT NULL,        -- e.g. 'log_paid', 'log_unpaid', 'announcement'
  channel_id  VARCHAR(30)  NOT NULL,
  admin_type  VARCHAR(50)  DEFAULT NULL,    -- role group to mention, e.g. 'moderator', 'admin'
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guild_type (guild_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 2. admin_roles — maps typeaccount -> Discord role ID
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_roles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  guild_id     VARCHAR(30)  NOT NULL,
  typeaccount  VARCHAR(50)  NOT NULL,       -- e.g. 'moderator', 'admin', 'owner'
  roles_id     VARCHAR(30)  NOT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guild_typeaccount (guild_id, typeaccount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 3. categories — linked to products, holds delivery_type
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT         DEFAULT NULL,
  delivery_type ENUM('auto_role','ingame_link','voucher','raw_text') NOT NULL DEFAULT 'raw_text',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 4. Alter products — add category_id foreign key
--    (skip if column already exists)
-- -------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL AFTER id;

-- Add foreign key only if not exists
-- (MySQL 8.0+ supports this safely; for older versions run manually if error)
ALTER TABLE products
  ADD CONSTRAINT fk_product_category
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
