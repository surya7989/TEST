-- ============================================================================
-- AT SPECIALISTS AUSTRALIA - COMPLETE HOSTINGER MYSQL / MARIADB DATABASE SCHEMA
-- ============================================================================
-- Target Server: Hostinger MySQL / MariaDB 10.5+ (phpMyAdmin 1-Click Import)
-- Character Set: utf8mb4 (utf8mb4_unicode_ci)
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ----------------------------------------------------------------------------
-- 1. Table structure for `admin_users`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT 'AT Specialists Admin',
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'admin',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Admin Account (change the password immediately after first login
-- via Admin -> Settings; never share the initial credential).
-- Initial email: admin@atspecialists.com.au
INSERT INTO `admin_users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'Clinical Administrator', 'admin@atspecialists.com.au', '$2a$10$8xaC6ryioGWdi8Mm188wbu.5w.JiKGlNTg8ybAnJqgkFxWndcLU9a', 'admin')
ON DUPLICATE KEY UPDATE `email` = `email`;

-- ----------------------------------------------------------------------------
-- 2. Table structure for `customers`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `password_set` tinyint(1) NOT NULL DEFAULT 0,
  `phone` varchar(50) DEFAULT '',
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT '',
  `state` varchar(50) DEFAULT '',
  `postcode` varchar(20) DEFAULT '',
  `ndis_number` varchar(100) DEFAULT '',
  `plan_type` varchar(50) DEFAULT 'plan_managed',
  `plan_manager` varchar(255) DEFAULT '',
  `plan_manager_email` varchar(255) DEFAULT '',
  `orders_count` int(11) DEFAULT 0,
  `total_spent` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_cust_email_unique` (`email`),
  KEY `idx_cust_ndis` (`ndis_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table structure for `products`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `category` varchar(100) DEFAULT 'Mobility',
  `categories_json` longtext DEFAULT NULL,
  `image` text DEFAULT NULL,
  `gallery_images_json` longtext DEFAULT NULL,
  `brand` varchar(100) DEFAULT 'AT Specialists',
  `stock` int(11) DEFAULT 100,
  `low_stock_threshold` int(11) DEFAULT 5,
  `is_featured` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `hire_price` decimal(10,2) DEFAULT 0.00,
  `hire_period` varchar(50) DEFAULT 'week',
  `gst_type` varchar(50) DEFAULT 'gst-free',
  `gst_rate` decimal(5,2) DEFAULT 0.00,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `ndis_code` varchar(100) DEFAULT '',
  `description` longtext DEFAULT NULL,
  `short_description` text DEFAULT NULL,
  `badge` varchar(100) DEFAULT NULL,
  `has_free_sample` tinyint(1) DEFAULT 0,
  `sample_note` varchar(255) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT 5.00,
  `review_count` int(11) DEFAULT 10,
  `attributes_json` longtext DEFAULT NULL,
  `variants_json` longtext DEFAULT NULL,
  `features_json` longtext DEFAULT NULL,
  `specs_json` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_slug` (`slug`),
  KEY `idx_products_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Non-destructive column additions for existing Hostinger databases
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `categories_json` longtext DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `gallery_images_json` longtext DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `hire_period` varchar(50) DEFAULT 'week';
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `short_description` text DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `badge` varchar(100) DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `has_free_sample` tinyint(1) DEFAULT 0;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `sample_note` varchar(255) DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `rating` decimal(3,2) DEFAULT 5.00;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `review_count` int(11) DEFAULT 10;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `attributes_json` longtext DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `variants_json` longtext DEFAULT NULL;

-- New products are not featured by default (existing rows keep their flags).
ALTER TABLE `products` MODIFY `is_featured` tinyint(1) DEFAULT 0;

-- Initial Core Clinical Equipment & Assistive Tech Seeds
INSERT INTO `products` (
  `id`, `name`, `slug`, `sku`, `price`, `category`, `categories_json`, `image`, `gallery_images_json`,
  `brand`, `stock`, `low_stock_threshold`, `is_featured`, `is_active`, `hire_price`, `hire_period`,
  `gst_type`, `gst_rate`, `delivery_fee`, `ndis_code`, `short_description`, `description`, `badge`
) VALUES
('eq-101', 'Quantum Power Wheelchair Q6 Edge', 'quantum-power-wheelchair-q6-edge', 'EQ-101', 3450.00, 'Power Wheelchairs', '["Power Wheelchairs","Mobility"]', '/images/quantum_power_wheelchair.jpg', '["/images/quantum_power_wheelchair.jpg"]', 'Quantum Rehab', 15, 5, 1, 1, 180.00, 'week', 'gst-free', 0.00, 0.00, '05_122103112_0105_1_2', 'Advanced motorized wheelchair with Mid-Wheel 6 drive design and interactive joystick.', 'Premium clinical power wheelchair with advanced suspension and customizable seating options for high-dependency mobility.', 'Hire Available'),
('eq-102', 'Ultralight Folding Transport Wheelchair', 'ultralight-folding-transport-wheelchair', 'EQ-102', 800.00, 'Manual Wheelchairs', '["Manual Wheelchairs","Mobility"]', '/images/ultralight_wheelchair.jpg', '["/images/ultralight_wheelchair.jpg"]', 'Karma Mobility', 28, 5, 1, 1, 45.00, 'week', 'gst-free', 0.00, 0.00, '05_122103112_0105_1_2', 'Aircraft-grade lightweight folding frame for independent mobility and rapid transport.', 'Aircraft-grade lightweight aluminum manual wheelchair designed for easy folding, vehicle transport, and daily independent use.', 'NDIS Consumable'),
('eq-103', 'Alerta Bariatric Electric Hospital Bed', 'alerta-bariatric-electric-hospital-bed', 'EQ-103', 2850.00, 'Hospital & Care Beds', '["Hospital & Care Beds","Bedroom"]', '/images/hospital_bed.jpg', '["/images/hospital_bed.jpg"]', 'Alerta Medical', 12, 3, 1, 1, 120.00, 'week', 'gst-free', 0.00, 0.00, '05_122103112_0105_1_2', 'Full electric profiling care bed with auto-contouring, low entry, and Trendelenburg tilt.', 'Full electric 4-function bariatric profiling bed with auto-contouring, low entry height, and Trendelenburg tilt for clinical and home care.', 'Clinical Grade'),
('eq-104', 'Air-Cell Pressure Relief Cushion', 'air-cell-pressure-relief-cushion', 'EQ-104', 480.00, 'Pressure Care', '["Pressure Care","Cushions"]', '/images/pressure_cushion.jpg', '["/images/pressure_cushion.jpg"]', 'Roho', 40, 8, 1, 1, 30.00, 'week', 'gst-free', 0.00, 0.00, '05_122103112_0105_1_2', 'Adjustable interconnected air-cells for high ischemic relief and skin integrity.', 'Adjustable interconnected air-cell wheelchair cushion providing superior skin protection, pressure redistribution, and ischemic relief.', 'Top Rated')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ----------------------------------------------------------------------------
-- 4. Table structure for `orders`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` varchar(100) NOT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `customer_phone` varchar(50) DEFAULT '',
  `shipping_address` text DEFAULT NULL,
  `delivery_method` varchar(100) DEFAULT 'standard',
  `delivery_notes` text DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `gst_total` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `promo_code` varchar(50) DEFAULT '',
  `discount` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'confirmed',
  `payment_status` varchar(50) DEFAULT 'pending',
  `payment_method` varchar(50) DEFAULT 'paypal',
  `paypal_order_id` varchar(100) DEFAULT '',
  `paypal_capture_id` varchar(100) DEFAULT '',
  `paypal_payer_id` varchar(100) DEFAULT '',
  `paypal_payer_email` varchar(255) DEFAULT '',
  `tracking_number` varchar(100) DEFAULT '',
  `ndis_number` varchar(100) DEFAULT '',
  `access_token` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_customer_id` (`customer_id`),
  KEY `idx_orders_customer_email` (`customer_email`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_paypal_capture` (`paypal_capture_id`),
  KEY `idx_orders_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table structure for `order_items`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `product_id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `purchase_type` varchar(50) DEFAULT 'buy',
  `hire_weeks` int(11) DEFAULT 0,
  `gst_type` varchar(50) DEFAULT 'gst-free',
  `gst_rate` decimal(5,2) DEFAULT 0.00,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table structure for `payment_logs`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `paypal_order_id` varchar(100) DEFAULT '',
  `paypal_capture_id` varchar(100) DEFAULT '',
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'AUD',
  `status` varchar(50) NOT NULL DEFAULT 'COMPLETED',
  `payer_email` varchar(255) DEFAULT '',
  `payer_id` varchar(100) DEFAULT '',
  `raw_response` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_logs_order_id` (`order_id`),
  KEY `idx_payment_logs_capture_id` (`paypal_capture_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Table structure for `ndis_quotes`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ndis_quotes` (
  `id` varchar(100) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) DEFAULT '',
  `customer_phone` varchar(50) DEFAULT '',
  `shipping_address` text DEFAULT NULL,
  `ndis_number` varchar(100) DEFAULT '',
  `plan_type` varchar(50) DEFAULT 'plan_managed',
  `plan_manager` varchar(255) DEFAULT '',
  `plan_manager_email` varchar(255) DEFAULT '',
  `items_json` longtext DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `gst_total` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `promo_code` varchar(50) DEFAULT '',
  `discount` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'pending',
  `valid_until` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `access_token` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quotes_status` (`status`),
  KEY `idx_quotes_email` (`customer_email`),
  KEY `idx_quotes_ndis` (`ndis_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Table structure for `inquiries`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT '',
  `enquiry_type` varchar(100) DEFAULT 'General',
  `ndis_number` varchar(100) DEFAULT '',
  `plan_manager` varchar(255) DEFAULT '',
  `subject` varchar(255) DEFAULT 'Customer Inquiry',
  `message` longtext DEFAULT NULL,
  `preferred_contact` varchar(50) DEFAULT 'email',
  `status` varchar(50) DEFAULT 'new',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_status` (`status`),
  KEY `idx_inquiries_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Table structure for `reviews`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` varchar(100) NOT NULL,
  `product_id` varchar(100) DEFAULT '',
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) DEFAULT '',
  `rating` int(1) NOT NULL DEFAULT 5,
  `title` varchar(255) DEFAULT '',
  `comment` longtext DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `verified_purchase` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_product` (`product_id`),
  KEY `idx_reviews_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- New installs moderate reviews before they go live; existing databases keep
-- their rows untouched (only the column defaults change for future inserts).
ALTER TABLE `reviews` MODIFY `status` varchar(50) DEFAULT 'pending';
ALTER TABLE `reviews` MODIFY `verified_purchase` tinyint(1) DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 10. Table structure for `shipping_zones`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shipping_zones` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `regions` text DEFAULT NULL,
  `methods_json` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Australian delivery zones (keeps the API response shape consistent
-- with the database instead of the hardcoded fallback in api/index.php).
INSERT INTO `shipping_zones` (`id`, `name`, `regions`, `methods_json`) VALUES
('au-std', 'Standard Australian Delivery', '[\"AU\"]', '[{\"id\":\"standard\",\"name\":\"Standard Delivery\",\"rate\":0}]'),
('au-exp', 'Priority Express Courier', '[\"AU\"]', '[{\"id\":\"express\",\"name\":\"Express Courier\",\"rate\":29}]'),
('au-wg', 'White Glove Installation & Assembly', '[\"AU\"]', '[{\"id\":\"white_glove\",\"name\":\"White Glove Installation\",\"rate\":149}]')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ----------------------------------------------------------------------------
-- 11. Table structure for `app_settings`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clean Application Settings placeholders
INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
('store_info', '{\"clinicName\":\"AT Specialists Australia\",\"abn\":\"48 123 456 789\",\"phone\":\"0494 767 409\",\"email\":\"orders@atspecialists.com.au\",\"address\":\"Level 3, 120 Collins Street, Melbourne VIC 3000\"}'),
('shipping_defaults', '{\"standard\":0,\"express\":29,\"white_glove\":149}')
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;

-- ----------------------------------------------------------------------------
-- 12. Table structure for `documents` (Persistent Quotes, Invoices, Agreements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_id` varchar(100) NOT NULL UNIQUE,
  `template_id` varchar(100) NOT NULL DEFAULT 'quote',
  `customer_name` varchar(255) NOT NULL DEFAULT 'Valued Client',
  `customer_email` varchar(255) DEFAULT '',
  `customer_phone` varchar(50) DEFAULT '',
  `shipping_address` text DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `gst_total` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `items_json` longtext DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `extra_meta_json` longtext DEFAULT NULL,
  `custom_settings_json` longtext DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_doc_id` (`doc_id`),
  KEY `idx_doc_customer_email` (`customer_email`),
  KEY `idx_doc_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. Table structure for `rentals` (Clinical & Equipment Hire)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rentals` (
  `id` varchar(100) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `customer_phone` varchar(50) DEFAULT '',
  `product_id` varchar(100) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `weeks` int(11) NOT NULL DEFAULT 2,
  `weekly_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) DEFAULT 0.00,
  `deposit` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rentals_customer_email` (`customer_email`),
  KEY `idx_rentals_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. Table structure for `promotions` (NDIS & Promotional Discounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `promotions` (
  `id` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL UNIQUE,
  `description` varchar(255) DEFAULT '',
  `discount_type` varchar(20) NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `min_spend` decimal(10,2) DEFAULT 0.00,
  `max_usage` int(11) DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `valid_until` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_promo_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Active Promotions
INSERT INTO `promotions` (`id`, `code`, `description`, `discount_type`, `discount_value`, `min_spend`, `is_active`) VALUES
('promo-01', 'NDIS10', '10% Assistive Equipment Rebate for Self/Plan Managed Participants', 'percentage', 10.00, 200.00, 1),
('promo-02', 'CLINICAL50', '$50 Clinical Equipment Credit on Orders Above $500', 'fixed', 50.00, 500.00, 1)
ON DUPLICATE KEY UPDATE `code` = `code`;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
