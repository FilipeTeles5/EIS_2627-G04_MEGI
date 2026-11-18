USE movio;

START TRANSACTION;

INSERT INTO users
    (user_id, username, password_hash, email, name, phone, nif, role, approved_status)
VALUES
    (1, 'admin_demo', '$2y$12$TjCjD1JNhTvqJa8YfNmL2uDprVBxO7e6XCHZR6WwshXcSz6b1JOs6',
     'admin@example.test', 'Demo Admin', '+351 000 000 001', '900000001', 'admin', 'approved'),
    (2, 'staff_demo', '$2y$12$myA/kxx5tqbHENL/NA.GZO0ZFFOEL9jDO32PiyKhKlGvgcPdcVMLy',
     'staff@example.test', 'Demo Staff', '+351 000 000 002', '900000002', 'staff', 'approved'),
    (3, 'courier_demo', '$2y$12$x/CPiGFCH.1ao0pJcK0tJ.fLx836J1P4eXsZD5cLetxLhoRVFeYae',
     'courier@example.test', 'Demo Courier', '+351 000 000 003', '900000003', 'courier', 'approved'),
    (4, 'client_demo', '$2y$12$xeWOsz0e0JU45wLmayWha.6vvnKq0.YKbSWC80YPfrGau5xQ0h0su',
     'client@example.test', 'Demo Client', '+351 000 000 004', '900000004', 'client', 'approved'),
    (5, 'client_two_demo', '$2y$12$n/vbEME6s9qj1.NyIvMK6OCz4IzneAk3xusbx2DJN44rJDn7OpKnS',
     'client2@example.test', 'Second Demo Client', '+351 000 000 005', '900000005', 'client', 'approved')
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    password_hash = VALUES(password_hash),
    email = VALUES(email),
    name = VALUES(name),
    phone = VALUES(phone),
    nif = VALUES(nif),
    role = VALUES(role),
    approved_status = VALUES(approved_status);

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
    (1, 3, 3, '00-DEMO-01', 'Demo Van', 1200.000, 10.000,
     '2027-12-31', '2027-12-31', 'demo/insurance.pdf',
     'demo/inspection.pdf', 'approved')
ON DUPLICATE KEY UPDATE
    courier_id = VALUES(courier_id),
    type_id = VALUES(type_id),
    model = VALUES(model),
    max_weight_kg = VALUES(max_weight_kg),
    max_vol_m3 = VALUES(max_vol_m3),
    approval_status = VALUES(approval_status);

INSERT INTO vehicle_audit (audit_id, vehicle_id, staff_id, decision, comments)
VALUES (1, 1, 2, 'approved', 'Demonstration vehicle approval.')
ON DUPLICATE KEY UPDATE
    decision = VALUES(decision),
    comments = VALUES(comments);

INSERT INTO routes (route_id, courier_id, vehicle_id, status)
VALUES
    (1, 3, 1, 'active'),
    (2, 3, 1, 'completed')
ON DUPLICATE KEY UPDATE
    courier_id = VALUES(courier_id),
    vehicle_id = VALUES(vehicle_id),
    status = VALUES(status);

INSERT INTO orders
    (order_id, client_id, route_id, origin_lat, origin_long, dest_lat, dest_long,
     status, attempt, total_price, created_at, completed_at)
VALUES
    (1041, 4, 2, 41.177900, -8.598000, 41.545400, -8.426500,
     'completed', 1, 8.50, '2026-10-02 10:00:00', '2026-10-03 12:00:00'),
    (1042, 4, 1, 41.177900, -8.598000, 41.149600, -8.610900,
     'in_progress', 1, 5.00, '2026-10-05 14:20:00', NULL),
    (1043, 4, NULL, 41.157900, -8.629100, 41.545400, -8.426500,
     'pending', 0, 7.50, '2026-10-06 09:00:00', NULL),
    (1044, 5, NULL, 41.157900, -8.629100, 41.149600, -8.610900,
     'pending', 0, 3.00, '2026-10-07 09:00:00', NULL)
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
    completed_at = VALUES(completed_at);

INSERT INTO products
    (product_id, order_id, description, category, weight_kg, volume_m3, created_at)
VALUES
    (1, 1041, 'Parcel', 'General', 1.000, 0.010, '2026-10-02 10:00:00'),
    (2, 1042, 'Laptop', 'Electronics', 2.400, 0.030, '2026-10-05 14:20:00'),
    (3, 1042, 'Documents', 'Documents', 0.600, 0.004, '2026-10-05 14:20:00'),
    (4, 1043, 'Parcel', 'General', 1.000, 0.010, '2026-10-06 09:00:00'),
    (5, 1044, 'Parcel', 'General', 1.000, 0.010, '2026-10-07 09:00:00')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    description = VALUES(description),
    category = VALUES(category),
    weight_kg = VALUES(weight_kg),
    volume_m3 = VALUES(volume_m3);

INSERT INTO epods (epod_id, order_id, proof_type, file_path, submitted_at)
VALUES (1, 1041, 'photo', 'demo/order-1041-proof.jpg', '2026-10-03 12:00:00')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    proof_type = VALUES(proof_type),
    file_path = VALUES(file_path),
    submitted_at = VALUES(submitted_at);

INSERT INTO order_status_log (log_id, order_id, changed_by_user_id, status_name, changed_at)
VALUES
    (1, 1041, 3, 'completed', '2026-10-03 12:00:00'),
    (2, 1042, 3, 'in_progress', '2026-10-05 15:00:00'),
    (3, 1043, 4, 'pending', '2026-10-06 09:00:00'),
    (4, 1044, 5, 'pending', '2026-10-07 09:00:00')
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    changed_by_user_id = VALUES(changed_by_user_id),
    status_name = VALUES(status_name),
    changed_at = VALUES(changed_at);

INSERT INTO notifications
    (notification_id, user_id, vehicle_id, message, notification_type, is_read, created_at)
VALUES
    (1, 2, 1, 'A demo vehicle is ready for review.', 'vehicle_review', 0, '2026-10-01 09:00:00')
ON DUPLICATE KEY UPDATE
    user_id = VALUES(user_id),
    vehicle_id = VALUES(vehicle_id),
    message = VALUES(message),
    notification_type = VALUES(notification_type),
    is_read = VALUES(is_read);

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
    (1, 1041, 8.50, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1041', '2026-10-02 10:05:00', '2026-10-02 10:05:02'),
    (2, 1042, 5.00, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1042', '2026-10-05 14:25:00', '2026-10-05 14:25:02'),
    (3, 1043, 7.50, 'EUR', 'confirmed', 'MockGateway', 'demo-payment-1043', '2026-10-06 09:05:00', '2026-10-06 09:05:02'),
    (4, 1044, 3.00, 'EUR', 'pending', 'MockGateway', NULL, '2026-10-07 09:05:00', NULL)
ON DUPLICATE KEY UPDATE
    order_id = VALUES(order_id),
    amount = VALUES(amount),
    currency = VALUES(currency),
    status = VALUES(status),
    gateway_name = VALUES(gateway_name),
    gateway_reference = VALUES(gateway_reference),
    completed_at = VALUES(completed_at);

COMMIT;
