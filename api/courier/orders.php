<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    movioRespond(405, ['error' => 'Method not allowed. Use GET or POST.']);
}
$courierId = movioRequireRole('courier');

function movioCourierVehicle(
    PDO $pdo,
    int $courierId,
    ?int $vehicleId = null,
    bool $forUpdate = false
): array|false
{
    $sql = 'SELECT vehicle_id, model, license_plate, max_weight_kg, max_vol_m3
            FROM vehicles
            WHERE courier_id = :courier_id
              AND approval_status = :approval_status';
    $parameters = ['courier_id' => $courierId, 'approval_status' => 'approved'];
    if ($vehicleId !== null) {
        $sql .= ' AND vehicle_id = :vehicle_id';
        $parameters['vehicle_id'] = $vehicleId;
    }
    $sql .= ' ORDER BY vehicle_id LIMIT 1';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $statement = $pdo->prepare($sql);
    $statement->execute($parameters);
    return $statement->fetch();
}

try {
    $pdo = movioDatabase();

    if ($method === 'GET') {
        $courierStatement = $pdo->prepare(
            'SELECT user_id
             FROM users
             WHERE user_id = :user_id AND role = :role AND approved_status = :approved_status'
        );
        $courierStatement->execute([
            'user_id' => $courierId,
            'role' => 'courier',
            'approved_status' => 'approved',
        ]);
        if ($courierStatement->fetchColumn() === false) {
            movioRespond(403, ['error' => 'An approved Courier account is required.']);
        }

        $routeStatement = $pdo->prepare(
            'SELECT route_id, status, vehicle_id
             FROM routes
             WHERE courier_id = :courier_id AND status IN (:planning_status, :active_status)
             ORDER BY CASE status WHEN :active_sort THEN 0 ELSE 1 END, route_id DESC'
        );
        $routeStatement->execute([
            'courier_id' => $courierId,
            'planning_status' => 'planning',
            'active_status' => 'active',
            'active_sort' => 'active',
        ]);
        $routes = $routeStatement->fetchAll();
        $activeRoutes = array_filter($routes, static fn(array $route): bool => $route['status'] === 'active');
        $planningRoutes = array_filter($routes, static fn(array $route): bool => $route['status'] === 'planning');
        $currentRoute = $routes[0] ?? null;
        $currentRouteOrderCount = 0;
        if ($currentRoute !== null) {
            $routeOrderCountStatement = $pdo->prepare(
                'SELECT COUNT(*) FROM orders WHERE route_id = :route_id'
            );
            $routeOrderCountStatement->execute(['route_id' => $currentRoute['route_id']]);
            $currentRouteOrderCount = (int) $routeOrderCountStatement->fetchColumn();
        }

        $vehicleCountStatement = $pdo->prepare(
            'SELECT COUNT(*) FROM vehicles
             WHERE courier_id = :courier_id AND approval_status = :approval_status'
        );
        $vehicleCountStatement->execute([
            'courier_id' => $courierId,
            'approval_status' => 'approved',
        ]);
        $approvedVehicleCount = (int) $vehicleCountStatement->fetchColumn();

        $completedOrderCountStatement = $pdo->prepare(
            'SELECT COUNT(*)
             FROM orders AS completed
             INNER JOIN routes AS assigned_route ON assigned_route.route_id = completed.route_id
             WHERE assigned_route.courier_id = :courier_id AND completed.status = :status'
        );
        $completedOrderCountStatement->execute([
            'courier_id' => $courierId,
            'status' => 'completed',
        ]);
        $completedOrderCount = (int) $completedOrderCountStatement->fetchColumn();

        $vehicle = $currentRoute !== null
            ? movioCourierVehicle($pdo, $courierId, (int) $currentRoute['vehicle_id'])
            : movioCourierVehicle($pdo, $courierId);
        $blockReason = null;
        if (count($activeRoutes) > 0) {
            $blockReason = 'active_route';
        } elseif (count($planningRoutes) > 1) {
            $blockReason = 'multiple_planning_routes';
        } elseif ($vehicle === false) {
            $blockReason = 'no_approved_vehicle';
        }

        $ordersStatement = $pdo->prepare(
            'SELECT available.order_id, available.created_at, available.total_price,
                    CONCAT(available.origin_lat, \', \', available.origin_long) AS pickup,
                    CONCAT(available.dest_lat, \', \', available.dest_long) AS destination,
                    client.name AS client_name
             FROM courier_available_orders AS available
             INNER JOIN users AS client ON client.user_id = available.client_id
             ORDER BY available.created_at, available.order_id'
        );
        $ordersStatement->execute();
        $orders = [];
        $orderIndexes = [];
        while ($row = $ordersStatement->fetch()) {
            $orderId = (int) $row['order_id'];
            $orderIndexes[(string) $orderId] = count($orders);
            $orders[] = [
                'id' => $orderId,
                'created_at' => $row['created_at'],
                'totalPrice' => $row['total_price'],
                'pickup' => $row['pickup'],
                'destination' => $row['destination'],
                'clientName' => $row['client_name'],
                'paymentStatus' => 'confirmed',
                'products' => [],
            ];
        }

        $productStatement = $pdo->prepare(
            'SELECT product.order_id, product.description, product.category,
                    product.weight_kg, product.volume_m3
             FROM products AS product
             INNER JOIN courier_available_orders AS available
                 ON available.order_id = product.order_id
             ORDER BY product.product_id'
        );
        $productStatement->execute();
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

        movioRespond(200, [
            'orders' => $orders,
            'dashboard' => [
                'open_routes' => count($routes),
                'orders_on_current_route' => $currentRouteOrderCount,
                'approved_vehicles' => $approvedVehicleCount,
                'completed_deliveries' => $completedOrderCount,
            ],
            'current_route' => $currentRoute === null ? null : [
                'route_id' => (int) $currentRoute['route_id'],
                'status' => $currentRoute['status'],
            ],
            'vehicle' => $vehicle === false ? null : [
                'vehicle_id' => (int) $vehicle['vehicle_id'],
                'model' => $vehicle['model'],
                'license_plate' => $vehicle['license_plate'],
                'max_weight_kg' => $vehicle['max_weight_kg'],
                'max_vol_m3' => $vehicle['max_vol_m3'],
            ],
            'can_assign' => $blockReason === null,
            'assignment_block_reason' => $blockReason,
        ]);
    }

    $request = movioReadJsonRequest();
    $orderId = filter_var($request['order_id'] ?? null, FILTER_VALIDATE_INT);
    if ($orderId === false || $orderId === null || $orderId < 1) {
        movioRespond(422, ['error' => 'order_id must be a positive integer.']);
    }

    $pdo->beginTransaction();
    $courierStatement = $pdo->prepare(
        'SELECT user_id
         FROM users
         WHERE user_id = :user_id AND role = :role AND approved_status = :approved_status
         FOR UPDATE'
    );
    $courierStatement->execute([
        'user_id' => $courierId,
        'role' => 'courier',
        'approved_status' => 'approved',
    ]);
    if ($courierStatement->fetchColumn() === false) {
        $pdo->rollBack();
        movioRespond(403, ['error' => 'An approved Courier account is required.']);
    }

    $orderStatement = $pdo->prepare(
        'SELECT order_id, status, route_id
         FROM orders
         WHERE order_id = :order_id
         FOR UPDATE'
    );
    $orderStatement->execute(['order_id' => $orderId]);
    $order = $orderStatement->fetch();
    if ($order === false) {
        $pdo->rollBack();
        movioRespond(404, ['error' => 'Order not found.']);
    }
    if ($order['status'] !== 'pending' || $order['route_id'] !== null) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'Only unassigned pending orders can be assigned.']);
    }

    $paymentStatement = $pdo->prepare(
        'SELECT payment_id
         FROM payments
         WHERE order_id = :order_id AND status = :status
         LIMIT 1
         FOR UPDATE'
    );
    $paymentStatement->execute(['order_id' => $orderId, 'status' => 'confirmed']);
    if ($paymentStatement->fetchColumn() === false) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'Only orders with a confirmed payment can be assigned.']);
    }

    $routeStatement = $pdo->prepare(
        'SELECT route_id, status, vehicle_id
         FROM routes
         WHERE courier_id = :courier_id AND status IN (:planning_status, :active_status)
         ORDER BY route_id DESC
         FOR UPDATE'
    );
    $routeStatement->execute([
        'courier_id' => $courierId,
        'planning_status' => 'planning',
        'active_status' => 'active',
    ]);
    $routes = $routeStatement->fetchAll();
    $activeRoutes = array_filter($routes, static fn(array $route): bool => $route['status'] === 'active');
    $planningRoutes = array_filter($routes, static fn(array $route): bool => $route['status'] === 'planning');
    if (count($activeRoutes) > 0) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'Finish the active route before assigning new orders.']);
    }
    if (count($planningRoutes) > 1) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'More than one route is being prepared. Contact an Admin.']);
    }

    $routeCreated = false;
    if (count($planningRoutes) === 1) {
        $route = reset($planningRoutes);
        $routeId = (int) $route['route_id'];
        $vehicle = movioCourierVehicle($pdo, $courierId, (int) $route['vehicle_id'], true);
        if ($vehicle === false) {
            $pdo->rollBack();
            movioRespond(409, ['error' => 'The route does not have an approved vehicle.']);
        }
    } else {
        $vehicle = movioCourierVehicle($pdo, $courierId, null, true);
        if ($vehicle === false) {
            $pdo->rollBack();
            movioRespond(409, ['error' => 'An approved vehicle is required before assigning orders.']);
        }
        $routeInsert = $pdo->prepare(
            'INSERT INTO routes (courier_id, vehicle_id, status)
             VALUES (:courier_id, :vehicle_id, :status)'
        );
        $routeInsert->execute([
            'courier_id' => $courierId,
            'vehicle_id' => $vehicle['vehicle_id'],
            'status' => 'planning',
        ]);
        $routeId = (int) $pdo->lastInsertId();
        $routeCreated = true;
    }

    $capacityStatement = $pdo->prepare(
        'SELECT COALESCE(SUM(product.weight_kg), 0) AS weight_kg,
                COALESCE(SUM(product.volume_m3), 0) AS volume_m3
         FROM orders AS assigned
         INNER JOIN products AS product ON product.order_id = assigned.order_id
         WHERE assigned.route_id = :route_id'
    );
    $capacityStatement->execute(['route_id' => $routeId]);
    $routeCapacity = $capacityStatement->fetch();

    $orderProductsStatement = $pdo->prepare(
        'SELECT COALESCE(SUM(weight_kg), 0) AS weight_kg,
                COALESCE(SUM(volume_m3), 0) AS volume_m3
         FROM products
         WHERE order_id = :order_id'
    );
    $orderProductsStatement->execute(['order_id' => $orderId]);
    $orderCapacity = $orderProductsStatement->fetch();
    if (
        (float) $routeCapacity['weight_kg'] + (float) $orderCapacity['weight_kg'] > (float) $vehicle['max_weight_kg']
        || (float) $routeCapacity['volume_m3'] + (float) $orderCapacity['volume_m3'] > (float) $vehicle['max_vol_m3']
    ) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'The order exceeds the remaining capacity of the route vehicle.']);
    }

    $updateOrder = $pdo->prepare(
        'UPDATE orders
         SET route_id = :route_id, status = :status
         WHERE order_id = :order_id AND route_id IS NULL AND status = :pending_status'
    );
    $updateOrder->execute([
        'route_id' => $routeId,
        'status' => 'initiated',
        'order_id' => $orderId,
        'pending_status' => 'pending',
    ]);
    if ($updateOrder->rowCount() !== 1) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'The order is no longer available. Refresh the list and try again.']);
    }

    $logStatement = $pdo->prepare(
        'INSERT INTO order_status_log (order_id, changed_by_user_id, status_name)
         VALUES (:order_id, :courier_id, :status_name)'
    );
    $logStatement->execute([
        'order_id' => $orderId,
        'courier_id' => $courierId,
        'status_name' => 'initiated',
    ]);
    $pdo->commit();

    movioRespond(200, [
        'order_id' => (int) $orderId,
        'route_id' => $routeId,
        'status' => 'initiated',
        'route_created' => $routeCreated,
        'vehicle' => [
            'vehicle_id' => (int) $vehicle['vehicle_id'],
            'model' => $vehicle['model'],
            'license_plate' => $vehicle['license_plate'],
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not load or assign Courier orders.']);
}
