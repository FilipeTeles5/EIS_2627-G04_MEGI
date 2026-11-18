CREATE DATABASE IF NOT EXISTS movio
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE movio;

CREATE TABLE IF NOT EXISTS users (
    user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(254) NOT NULL,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NULL,
    nif VARCHAR(20) NULL,
    role ENUM('client', 'courier', 'staff', 'admin') NOT NULL,
    approved_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    review_comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_types (
    type_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    type_name VARCHAR(40) NOT NULL,
    PRIMARY KEY (type_id),
    UNIQUE KEY uq_vehicle_types_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    courier_id INT UNSIGNED NOT NULL,
    type_id INT UNSIGNED NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    model VARCHAR(100) NOT NULL,
    max_weight_kg DECIMAL(10, 3) NOT NULL,
    max_vol_m3 DECIMAL(10, 3) NOT NULL,
    insurance_expiry_date DATE NULL,
    inspection_expiry_date DATE NULL,
    insurance_expiry_doc VARCHAR(255) NULL,
    inspection_expiry_doc VARCHAR(255) NULL,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documents_updated_at DATETIME NULL,
    PRIMARY KEY (vehicle_id),
    UNIQUE KEY uq_vehicles_license_plate (license_plate),
    KEY idx_vehicles_courier_status (courier_id, approval_status),
    CONSTRAINT fk_vehicles_courier
        FOREIGN KEY (courier_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_vehicles_type
        FOREIGN KEY (type_id) REFERENCES vehicle_types (type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_audit (
    audit_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    staff_id INT UNSIGNED NOT NULL,
    audit_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decision ENUM('approved', 'rejected') NOT NULL,
    comments TEXT NULL,
    PRIMARY KEY (audit_id),
    KEY idx_vehicle_audit_vehicle_date (vehicle_id, audit_date),
    CONSTRAINT fk_vehicle_audit_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (vehicle_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_vehicle_audit_staff
        FOREIGN KEY (staff_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS routes (
    route_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    courier_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NOT NULL,
    status ENUM('planning', 'active', 'completed') NOT NULL DEFAULT 'planning',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (route_id),
    KEY idx_routes_courier_status (courier_id, status),
    KEY idx_routes_vehicle (vehicle_id),
    CONSTRAINT fk_routes_courier
        FOREIGN KEY (courier_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_routes_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (vehicle_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_id INT UNSIGNED NOT NULL,
    route_id INT UNSIGNED NULL,
    origin_lat DECIMAL(9, 6) NOT NULL,
    origin_long DECIMAL(9, 6) NOT NULL,
    dest_lat DECIMAL(9, 6) NOT NULL,
    dest_long DECIMAL(9, 6) NOT NULL,
    status ENUM('pending', 'initiated', 'in_progress', 'completed', 'cancelled')
        NOT NULL DEFAULT 'pending',
    attempt INT UNSIGNED NOT NULL DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    PRIMARY KEY (order_id),
    KEY idx_orders_client_created (client_id, created_at),
    KEY idx_orders_route_status (route_id, status),
    KEY idx_orders_status_created (status, created_at),
    CONSTRAINT fk_orders_client
        FOREIGN KEY (client_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_route
        FOREIGN KEY (route_id) REFERENCES routes (route_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    product_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL,
    weight_kg DECIMAL(10, 3) NOT NULL,
    volume_m3 DECIMAL(10, 3) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    KEY idx_products_order (order_id),
    CONSTRAINT fk_products_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS epods (
    epod_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    proof_type VARCHAR(40) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (epod_id),
    UNIQUE KEY uq_epods_order (order_id),
    CONSTRAINT fk_epods_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_log (
    log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    changed_by_user_id INT UNSIGNED NOT NULL,
    status_name VARCHAR(40) NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_order_status_log_order_date (order_id, changed_at),
    CONSTRAINT fk_order_status_log_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_status_log_user
        FOREIGN KEY (changed_by_user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(60) NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id),
    KEY idx_notifications_user_read_date (user_id, is_read, created_at),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notifications_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (vehicle_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pricing_config (
    config_id TINYINT UNSIGNED NOT NULL,
    fee_base DECIMAL(10, 2) NOT NULL,
    rate_km DECIMAL(10, 4) NOT NULL,
    rate_kg DECIMAL(10, 4) NOT NULL,
    updated_by INT UNSIGNED NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (config_id),
    CONSTRAINT fk_pricing_config_admin
        FOREIGN KEY (updated_by) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    status ENUM('pending', 'confirmed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    gateway_name VARCHAR(50) NOT NULL DEFAULT 'MockGateway',
    gateway_reference VARCHAR(120) NULL,
    checkout_url VARCHAR(2048) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    PRIMARY KEY (payment_id),
    UNIQUE KEY uq_payments_gateway_reference (gateway_reference),
    KEY idx_payments_order_status (order_id, status),
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- config_id 1 is the single active pricing configuration; orders keep their quoted total.
-- Courier-facing code should read this view so unpaid orders cannot be offered.
CREATE OR REPLACE VIEW courier_available_orders AS
SELECT o.*
FROM orders AS o
WHERE o.route_id IS NULL
  AND o.status = 'pending'
  AND EXISTS (
      SELECT 1
      FROM payments AS p
      WHERE p.order_id = o.order_id
        AND p.status = 'confirmed'
  );
