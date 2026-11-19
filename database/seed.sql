USE movio;

START TRANSACTION;

-- Fictional demo accounts for each role and staff-approval state.
INSERT INTO users
    (user_id, username, password_hash, email, name, phone, nif, role, approved_status, review_comment)
VALUES
    (1, 'rita.ferreira', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'rita.ferreira@example.test', 'Rita Ferreira', '+351 91X XXX 101', NULL, 'admin', 'approved', NULL),
    (2, 'joao.martins', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'joao.martins@example.test', 'Joao Martins', '+351 91X XXX 102', NULL, 'staff', 'approved', NULL),
    (3, 'tiago.costa', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'tiago.costa@example.test', 'Tiago Costa', '+351 91X XXX 103', NULL, 'courier', 'approved', NULL),
    (4, 'mariana.silva', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'mariana.silva@example.test', 'Mariana Silva', '+351 91X XXX 104', NULL, 'client', 'approved', NULL),
    (5, 'andre.almeida', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'andre.almeida@example.test', 'Andre Almeida', '+351 91X XXX 105', NULL, 'client', 'approved', NULL),
    (6, 'beatriz.santos', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'beatriz.santos@example.test', 'Beatriz Santos', '+351 91X XXX 106', NULL, 'courier', 'approved', NULL),
    (7, 'sofia.rocha', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'sofia.rocha@example.test', 'Sofia Rocha', '+351 91X XXX 107', NULL, 'client', 'approved', NULL),
    (8, 'miguel.pereira', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'miguel.pereira@example.test', 'Miguel Pereira', '+351 91X XXX 108', NULL, 'client', 'approved', NULL),
    (9, 'catarina.lopes', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'catarina.lopes@example.test', 'Catarina Lopes', '+351 91X XXX 109', NULL, 'staff', 'pending',
     'Application awaiting review.'),
    (10, 'paulo.gomes', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'paulo.gomes@example.test', 'Paulo Gomes', '+351 91X XXX 110', NULL, 'staff', 'rejected',
     'Application did not meet the demonstration requirements.'),
    (11, 'rui.mendes', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'rui.mendes@example.test', 'Rui Mendes', '+351 91X XXX 111', NULL, 'courier', 'pending',
     'Courier account awaiting review.'),
    (12, 'ines.cardoso', '$2y$12$hvezCrqydHV7hxhV29TxwOKDubni/1W4CLT/Pt32B7sd87L26Mybm',
     'ines.cardoso@example.test', 'Ines Cardoso', '+351 91X XXX 112', NULL, 'client', 'approved', NULL)
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    password_hash = VALUES(password_hash),
    email = VALUES(email),
    name = VALUES(name),
    phone = VALUES(phone),
    nif = VALUES(nif),
    role = VALUES(role),
    approved_status = VALUES(approved_status),
    review_comment = VALUES(review_comment);

-- Vehicle types, demo vehicles, and their review records.
INSERT INTO vehicle_types (type_id, type_name)
VALUES
    (1, 'Bike'),
    (2, 'Moto'),
    (3, 'Van'),
    (4, 'Truck')
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name);

INSERT INTO vehicles
    (vehicle_id, courier_id, type_id, license_plate, model, max_weight_kg, max_vol_m3,
     insurance_expiry_date, inspection_expiry_date, insurance_expiry_doc,
     inspection_expiry_doc, approval_status)
VALUES
    (1, 3, 3, 'DEMO-PT-001', 'Renault Kangoo', 650.000, 3.300,
     '2027-12-31', '2027-12-31', 'demo/insurance-vehicle-1.pdf',
     'demo/inspection-vehicle-1.pdf', 'approved'),
    (2, 6, 2, 'DEMO-PT-002', 'Yamaha NMAX 125', 30.000, 0.180,
     '2027-08-31', '2027-08-31', 'demo/insurance-vehicle-2.pdf',
     'demo/inspection-vehicle-2.pdf', 'approved'),
    (3, 11, 1, 'DEMO-PT-003', 'Urban cargo bicycle', 45.000, 0.250,
     NULL, NULL, NULL, NULL, 'pending')
ON DUPLICATE KEY UPDATE
    courier_id = VALUES(courier_id),
    type_id = VALUES(type_id),
    license_plate = VALUES(license_plate),
    model = VALUES(model),
    max_weight_kg = VALUES(max_weight_kg),
    max_vol_m3 = VALUES(max_vol_m3),
    insurance_expiry_date = VALUES(insurance_expiry_date),
    inspection_expiry_date = VALUES(inspection_expiry_date),
    insurance_expiry_doc = VALUES(insurance_expiry_doc),
    inspection_expiry_doc = VALUES(inspection_expiry_doc),
    approval_status = VALUES(approval_status);

INSERT INTO vehicle_audit (audit_id, vehicle_id, staff_id, decision, comments)
VALUES
    (1, 1, 2, 'approved', 'Vehicle documents reviewed and approved.'),
    (2, 2, 2, 'approved', 'Vehicle documents reviewed and approved.')
ON DUPLICATE KEY UPDATE
    vehicle_id = VALUES(vehicle_id),
    staff_id = VALUES(staff_id),
    decision = VALUES(decision),
    comments = VALUES(comments);

-- Example routes and orders in different delivery states.
INSERT INTO routes (route_id, courier_id, vehicle_id, status)
VALUES
    (1, 3, 1, 'active'),
    (2, 3, 1, 'completed'),
    (3, 6, 2, 'active'),
    (4, 6, 2, 'completed')
ON DUPLICATE KEY UPDATE
    courier_id = VALUES(courier_id),
    vehicle_id = VALUES(vehicle_id),
    status = VALUES(status);

INSERT INTO orders
    (order_id, client_id, route_id, origin_lat, origin_long, dest_lat, dest_long,
     status, attempt, total_price, created_at, completed_at)
VALUES
    (1041, 4, 2, 41.157900, -8.629100, 41.545400, -8.426500,
     'completed', 1, 12.90, '2026-10-02 10:00:00', '2026-10-03 12:00:00'),
    (1042, 4, 1, 41.177900, -8.598000, 41.149600, -8.610900,
     'in_progress', 1, 5.00, '2026-10-05 14:20:00', NULL),
    (1043, 5, NULL, 41.157900, -8.629100, 41.149600, -8.610900,
     'pending', 0, 8.20, '2026-10-08 09:00:00', NULL),
    (1044, 5, NULL, 41.157900, -8.629100, 41.182400, -8.689100,
     'initiated', 0, 4.80, '2026-10-09 11:15:00', NULL),
    (1045, 7, NULL, 41.149600, -8.610900, 41.182400, -8.689100,
     'pending', 0, 3.75, '2026-10-10 08:40:00', NULL),
    (1046, 8, 4, 41.157900, -8.629100, 41.545400, -8.426500,
     'completed', 1, 18.40, '2026-10-11 13:30:00', '2026-10-12 16:10:00'),
    (1047, 12, 3, 41.149600, -8.610900, 41.248000, -8.681000,
     'in_progress', 1, 9.60, '2026-10-13 10:05:00', NULL),
    (1048, 7, NULL, 41.157900, -8.629100, 41.209600, -8.565200,
     'pending', 0, 7.25, '2026-10-14 15:25:00', NULL),
    (1049, 8, NULL, 41.149600, -8.610900, 41.157900, -8.629100,
     'cancelled', 0, 6.10, '2026-10-15 09:50:00', NULL),
    (1050, 12, NULL, 41.157900, -8.629100, 41.182400, -8.689100,
     'pending', 0, 5.40, '2026-10-16 12:00:00', NULL)
ON DUPLICATE KEY UPDATE
    client_id = VALUES(client_id),
    route_id = VALUES(route_id),
    origin_lat = VALUES(origin_lat),
    origin_long = VALUES(origin_long),
    dest_lat = VALUES(dest_lat),
    dest_long = VALUES(dest_long),
    status = VALUES(status),
    attempt = VALUES(attempt),
    total_price = VALUES(total_price),
    created_at = VALUES(created_at),
    completed_at = VALUES(completed_at);

-- Product measurements used by order summaries and vehicle-capacity checks.
INSERT INTO products
    (product_id, order_id, description, category, weight_kg, volume_m3, created_at)
VALUES
    (1, 1041, 'Box of books', 'Books', 8.000, 0.040, '2026-10-02 10:00:00'),
    (2, 1042, 'Laptop', 'Electronics', 2.400, 0.030, '2026-10-05 14:20:00'),
    (3, 1042, 'Documents folder', 'Documents', 0.600, 0.004, '2026-10-05 14:20:00'),
    (4, 1043, 'Box of clothing', 'Clothing', 3.200, 0.040, '2026-10-08 09:00:00'),
    (5, 1044, 'Small kitchen appliance', 'Home appliances', 5.500, 0.060, '2026-10-09 11:15:00'),
    (6, 1045, 'Contract documents', 'Documents', 0.200, 0.002, '2026-10-10 08:40:00'),
    (7, 1046, 'Bicycle spare parts', 'Sports', 6.500, 0.080, '2026-10-11 13:30:00'),
    (8, 1047, 'Camera equipment', 'Electronics', 3.800, 0.030, '2026-10-13 10:05:00'),
    (9, 1048, 'Small furniture package', 'Home', 14.000, 0.300, '2026-10-14 15:25:00'),
    (10, 1049, 'Kitchen accessories', 'Home', 2.100, 0.025, '2026-10-15 09:50:00'),
    (11, 1050, 'Sports equipment', 'Sports', 4.000, 0.050, '2026-10-16 12:00:00')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    description = VALUES(description),
    category = VALUES(category),
    weight_kg = VALUES(weight_kg),
    volume_m3 = VALUES(volume_m3),
    created_at = VALUES(created_at);

-- Example proof-of-delivery records and order status history.
INSERT INTO epods (epod_id, order_id, proof_type, file_path, submitted_at)
VALUES
    (1, 1041, 'photo', 'demo/order-1041-proof.jpg', '2026-10-03 12:00:00'),
    (2, 1046, 'signature', 'demo/order-1046-signature.png', '2026-10-12 16:10:00')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    proof_type = VALUES(proof_type),
    file_path = VALUES(file_path),
    submitted_at = VALUES(submitted_at);

INSERT INTO order_status_log (log_id, order_id, changed_by_user_id, status_name, changed_at)
VALUES
    (1, 1041, 4, 'pending', '2026-10-02 10:00:00'),
    (2, 1041, 3, 'in_progress', '2026-10-02 11:00:00'),
    (3, 1041, 3, 'completed', '2026-10-03 12:00:00'),
    (4, 1042, 4, 'pending', '2026-10-05 14:20:00'),
    (5, 1042, 4, 'initiated', '2026-10-05 14:25:00'),
    (6, 1042, 3, 'in_progress', '2026-10-05 15:00:00'),
    (7, 1043, 5, 'pending', '2026-10-08 09:00:00'),
    (8, 1044, 5, 'initiated', '2026-10-09 11:15:00'),
    (9, 1045, 7, 'pending', '2026-10-10 08:40:00'),
    (10, 1046, 8, 'pending', '2026-10-11 13:30:00'),
    (11, 1046, 6, 'in_progress', '2026-10-11 14:00:00'),
    (12, 1046, 6, 'completed', '2026-10-12 16:10:00'),
    (13, 1047, 12, 'pending', '2026-10-13 10:05:00'),
    (14, 1047, 6, 'in_progress', '2026-10-13 10:45:00'),
    (15, 1048, 7, 'pending', '2026-10-14 15:25:00'),
    (16, 1049, 8, 'pending', '2026-10-15 09:50:00'),
    (17, 1049, 8, 'cancelled', '2026-10-15 10:10:00'),
    (18, 1050, 12, 'pending', '2026-10-16 12:00:00')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    changed_by_user_id = VALUES(changed_by_user_id),
    status_name = VALUES(status_name),
    changed_at = VALUES(changed_at);

-- Sample notifications, PDF-example pricing rates, and payment outcomes.
INSERT INTO notifications
    (notification_id, user_id, vehicle_id, message, notification_type, is_read, created_at)
VALUES
    (1, 2, 1, 'The vehicle documents for Tiago Costa are ready for review.', 'vehicle_review', 0, '2026-10-01 09:00:00'),
    (2, 3, 1, 'Order 1042 has been assigned to your active route.', 'order_assigned', 0, '2026-10-05 14:30:00'),
    (3, 6, 2, 'Order 1047 has been assigned to your active route.', 'order_assigned', 1, '2026-10-13 10:20:00'),
    (4, 5, NULL, 'Payment for order 1044 is awaiting confirmation.', 'payment_pending', 0, '2026-10-09 11:16:00'),
    (5, 7, NULL, 'Payment for order 1048 could not be confirmed.', 'payment_failed', 0, '2026-10-14 15:30:00')
ON DUPLICATE KEY UPDATE
    user_id = VALUES(user_id),
    vehicle_id = VALUES(vehicle_id),
    message = VALUES(message),
    notification_type = VALUES(notification_type),
    is_read = VALUES(is_read),
    created_at = VALUES(created_at);

INSERT INTO pricing_config (config_id, fee_base, rate_km, rate_kg, updated_by)
VALUES (1, 2.50, 0.4000, 0.3000, 1)
ON DUPLICATE KEY UPDATE
    fee_base = VALUES(fee_base),
    rate_km = VALUES(rate_km),
    rate_kg = VALUES(rate_kg),
    updated_by = VALUES(updated_by);

INSERT INTO payments
    (payment_id, order_id, amount, currency, status, gateway_name, gateway_reference, created_at, completed_at)
VALUES
    (1, 1041, 12.90, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1041', '2026-10-02 10:05:00', '2026-10-02 10:05:02'),
    (2, 1042, 5.00, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1042', '2026-10-05 14:25:00', '2026-10-05 14:25:02'),
    (3, 1043, 8.20, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1043', '2026-10-08 09:05:00', '2026-10-08 09:05:02'),
    (4, 1044, 4.80, 'EUR', 'pending', 'MockGateway', NULL, '2026-10-09 11:16:00', NULL),
    (5, 1046, 18.40, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1046', '2026-10-11 13:35:00', '2026-10-11 13:35:02'),
    (6, 1047, 9.60, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1047', '2026-10-13 10:10:00', '2026-10-13 10:10:02'),
    (7, 1048, 7.25, 'EUR', 'failed', 'MockGateway', 'demo-payment-1048', '2026-10-14 15:27:00', NULL),
    (8, 1049, 6.10, 'EUR', 'cancelled', 'MockGateway', 'demo-payment-1049', '2026-10-15 09:55:00', NULL),
    (9, 1050, 5.40, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1050', '2026-10-16 12:05:00', '2026-10-16 12:05:02')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    amount = VALUES(amount),
    currency = VALUES(currency),
    status = VALUES(status),
    gateway_name = VALUES(gateway_name),
    gateway_reference = VALUES(gateway_reference),
    created_at = VALUES(created_at),
    completed_at = VALUES(completed_at);

COMMIT;
