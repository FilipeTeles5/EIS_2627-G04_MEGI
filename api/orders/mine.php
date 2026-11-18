<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    movioRespond(405, ['error' => 'Method not allowed. Use GET.']);
}

$clientId = movioRequireRole('client');

try {
    $pdo = movioDatabase();
    $orderStatement = $pdo->prepare(
        'SELECT o.order_id, o.created_at, o.status, o.route_id, o.attempt, o.total_price,
                CONCAT(o.origin_lat, \', \', o.origin_long) AS pickup,
                CONCAT(o.dest_lat, \', \', o.dest_long) AS destination,
                courier.name AS courier,
                CONCAT(vehicle.model, \' (\', vehicle.license_plate, \')\') AS vehicle,
                epod.file_path AS proof_file,
                payment.payment_id, payment.amount AS payment_amount,
                payment.currency AS payment_currency, payment.status AS payment_status
         FROM orders AS o
         LEFT JOIN routes AS route ON route.route_id = o.route_id
         LEFT JOIN users AS courier ON courier.user_id = route.courier_id
         LEFT JOIN vehicles AS vehicle ON vehicle.vehicle_id = route.vehicle_id
         LEFT JOIN epods AS epod ON epod.order_id = o.order_id
         LEFT JOIN payments AS payment ON payment.payment_id = (
             SELECT latest.payment_id
             FROM payments AS latest
             WHERE latest.order_id = o.order_id
             ORDER BY latest.payment_id DESC
             LIMIT 1
         )
         WHERE o.client_id = :client_id
         ORDER BY o.created_at DESC, o.order_id DESC'
    );
    $orderStatement->execute(['client_id' => $clientId]);
    $orders = [];
    $orderIndexes = [];
    while ($row = $orderStatement->fetch()) {
        $orderId = (int) $row['order_id'];
        $orderIndexes[(string) $orderId] = count($orders);
        $orders[] = [
            'id' => $orderId,
            'created_at' => $row['created_at'],
            'status' => $row['status'] === 'in_progress' ? 'in-progress' : $row['status'],
            'routeId' => $row['route_id'] === null ? null : (int) $row['route_id'],
            'attempt' => (int) $row['attempt'],
            'totalPrice' => $row['total_price'],
            'pickup' => $row['pickup'],
            'destination' => $row['destination'],
            'courier' => $row['courier'],
            'vehicle' => $row['vehicle'],
            'proofFile' => $row['proof_file'],
            'paymentId' => $row['payment_id'] === null ? null : (int) $row['payment_id'],
            'paymentAmount' => $row['payment_amount'],
            'paymentCurrency' => $row['payment_currency'],
            'paymentStatus' => $row['payment_status'],
            'products' => [],
        ];
    }

    $productStatement = $pdo->prepare(
        'SELECT product.order_id, product.description, product.category,
                product.weight_kg, product.volume_m3
         FROM products AS product
         INNER JOIN orders AS o ON o.order_id = product.order_id
         WHERE o.client_id = :client_id
         ORDER BY product.product_id'
    );
    $productStatement->execute(['client_id' => $clientId]);
    while ($product = $productStatement->fetch()) {
        $orderKey = (string) $product['order_id'];
        if (isset($orderIndexes[$orderKey])) {
            $orders[$orderIndexes[$orderKey]]['products'][] = [
                'description' => $product['description'],
                'category' => $product['category'],
                'weight_kg' => $product['weight_kg'],
                'volume_m3' => $product['volume_m3'],
            ];
        }
    }

    movioRespond(200, ['orders' => $orders]);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not load your orders.']);
}
