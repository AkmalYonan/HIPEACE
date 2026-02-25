-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for HIPEACE_BOT
CREATE DATABASE IF NOT EXISTS `HIPEACE_BOT` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `HIPEACE_BOT`;

-- Dumping structure for table HIPEACE_BOT.admin_roles
CREATE TABLE IF NOT EXISTS `admin_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guild_id` varchar(30) NOT NULL,
  `typeaccount` varchar(50) NOT NULL,
  `roles_id` varchar(30) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guild_typeaccount` (`guild_id`,`typeaccount`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table HIPEACE_BOT.admin_roles: ~2 rows (approximately)
INSERT INTO `admin_roles` (`id`, `guild_id`, `typeaccount`, `roles_id`, `created_at`, `updated_at`) VALUES
	(1, '862907253631483915', 'Owner', '863030198064119809', '2026-02-21 23:56:53', '2026-02-21 23:56:53'),
	(2, '862907253631483915', 'Moderator', '862934759083868161', '2026-02-21 23:58:53', '2026-02-21 23:58:53');

-- Dumping structure for table HIPEACE_BOT.bot_settings
CREATE TABLE IF NOT EXISTS `bot_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guild_id` varchar(30) NOT NULL,
  `type` varchar(50) NOT NULL,
  `channel_id` varchar(30) NOT NULL,
  `admin_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guild_type` (`guild_id`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table HIPEACE_BOT.bot_settings: ~0 rows (approximately)

-- Dumping structure for table HIPEACE_BOT.categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `delivery_type` enum('auto_role','ingame_link','voucher','raw_text') NOT NULL DEFAULT 'raw_text',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table HIPEACE_BOT.categories: ~3 rows (approximately)
INSERT INTO `categories` (`id`, `name`, `description`, `delivery_type`, `active`, `created_at`, `updated_at`) VALUES
	(1, 'WI-Fi Voucher', NULL, 'voucher', 1, '2026-02-21 23:59:52', '2026-02-21 23:59:52'),
	(2, 'Roles', NULL, 'auto_role', 1, '2026-02-22 00:00:38', '2026-02-22 00:00:38'),
	(3, 'Diskon', NULL, 'raw_text', 1, '2026-02-22 00:05:43', '2026-02-22 00:05:43');

-- Dumping structure for table HIPEACE_BOT.products
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `price` int DEFAULT NULL,
  `stock` int DEFAULT NULL,
  `active` enum('Y','N') DEFAULT NULL,
  `description` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_product_category` (`category_id`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='List Produk Penjualan';

-- Dumping data for table HIPEACE_BOT.products: ~4 rows (approximately)
INSERT INTO `products` (`id`, `category_id`, `name`, `price`, `stock`, `active`, `description`) VALUES
	(1, 2, 'VIP', 25000, 0, 'Y', NULL),
	(2, 2, 'VVIP', 50000, 15, 'Y', NULL),
	(3, 1, 'Wifi 2 Jam', 10000, 5, 'Y', 'Voucher WIFI 2 Jam'),
	(4, 3, 'Diskon 5%', 1000, 5, 'Y', NULL);

-- Dumping structure for table HIPEACE_BOT.shop_messages
CREATE TABLE IF NOT EXISTS `shop_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_id` varchar(50) NOT NULL DEFAULT '',
  `message_id` varchar(50) NOT NULL DEFAULT '',
  `user_id` varchar(50) DEFAULT NULL,
  `active` enum('Y','N') DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table HIPEACE_BOT.shop_messages: ~1 rows (approximately)
INSERT INTO `shop_messages` (`id`, `channel_id`, `message_id`, `user_id`, `active`) VALUES
	(1, '1469005562967756952', '863410178736914482', '320531646870847490', 'Y');

-- Dumping structure for table HIPEACE_BOT.transactions
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `merchant_ref` varchar(100) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `status` enum('UNPAID','PAID','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'UNPAID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `merchant_ref` (`merchant_ref`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table HIPEACE_BOT.transactions: ~4 rows (approximately)
INSERT INTO `transactions` (`id`, `user_id`, `product_id`, `merchant_ref`, `amount`, `status`, `created_at`) VALUES
	(10, '320531646870847490', 2, 'discord_2_1770480141027', 50000, 'PAID', '2026-02-07 17:16:25'),
	(11, '320531646870847490', 2, 'discord_2_1770527318922', 50000, 'PAID', '2026-02-08 05:08:39'),
	(12, '320531646870847490', 1, 'discord_1_1770527931698', 25000, 'PAID', '2026-02-08 05:18:51'),
	(13, '320531646870847490', 2, 'discord_2_1770532709962', 50000, 'PAID', '2026-02-08 06:38:30');

-- Dumping structure for table HIPEACE_BOT.withdraws
CREATE TABLE IF NOT EXISTS `withdraws` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_user` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_poin` int NOT NULL,
  `method_pay` set('Dana','Gopay','Shopeepay') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table HIPEACE_BOT.withdraws: ~4 rows (approximately)
INSERT INTO `withdraws` (`id`, `id_user`, `total_poin`, `method_pay`, `created_at`, `updated_at`) VALUES
	(1, '5', 10000, 'Dana', '2025-12-02 09:21:12', NULL),
	(2, '5', 20000, 'Shopeepay', '2025-12-02 09:43:01', NULL),
	(3, '5', 10000, 'Gopay', '2025-12-05 09:18:04', NULL),
	(4, '9', 10000, 'Gopay', '2025-12-08 22:15:09', NULL);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
