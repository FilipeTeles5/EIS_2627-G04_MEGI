<?php
declare(strict_types=1);

use Movio\Services\OsrmRouteDistanceException;
use Movio\Services\PricingService;

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__, 2) . '/src/Services/OsrmRouteDistance.php';
require_once dirname(__DIR__, 2) . '/src/Services/PriceCalculator.php';
require_once dirname(__DIR__, 2) . '/src/Services/PricingService.php';

// Recalculate the order price on the server and persist the order and products.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    movioRespond(405, ['error' => 'Method not allowed. Use POST.']);
}

$clientId = movioRequireRole('client');
$request = movioReadJsonRequest();

try {
    // Validate and normalize all requested products before calculating or saving the order.
    $originLat = movioReadNumber($request, 'origin_lat', -90.0);
    $originLong = movioReadNumber($request, 'origin_long', -180.0);
    $destinationLat = movioReadNumber($request, 'dest_lat', -90.0);
    $destinationLong = movioReadNumber($request, 'dest_long', -180.0);

    $products = $request['products'] ?? null;
    if (!is_array($products) || !array_is_list($products) || count($products) === 0 || count($products) > 50) {
        throw new InvalidArgumentException('Provide between 1 and 50 products.');
    }

    $normalizedProducts = [];
    $actualWeightKg = 0.0;
    $volumeM3 = 0.0;
    foreach ($products as $product) {
        if (!is_array($product)) {
            throw new InvalidArgumentException('Each product must be an object.');
        }
        $descriptionValue = $product['description'] ?? null;
        $categoryValue = $product['category'] ?? null;
        if (!is_string($descriptionValue) || !is_string($categoryValue)) {
            throw new InvalidArgumentException('Each product needs a text description and category.');
        }
        $description = trim($descriptionValue);
        $category = trim($categoryValue);
        $weightKg = movioReadNumber($product, 'weight_kg', 0.000001);
        $productVolumeM3 = movioReadNumber($product, 'volume_m3', 0.000001);
        if ($description === '' || strlen($description) > 255 || $category === '' || strlen($category) > 80) {
            throw new InvalidArgumentException('Each product needs a description and category within the allowed length.');
        }

        $normalizedProducts[] = [
            'description' => $description,
            'category' => $category,
            'weight_kg' => $weightKg,
            'volume_m3' => $productVolumeM3,
        ];
        $actualWeightKg += $weightKg;
        $volumeM3 += $productVolumeM3;
    }
} catch (InvalidArgumentException $exception) {
    movioRespond(422, ['error' => $exception->getMessage()]);
}

try {
    // Save the priced order, its products, and the initial status history atomically.
    $pdo = movioDatabase();
    $quote = (new PricingService($pdo))->quote(
        $originLat,
        $originLong,
        $destinationLat,
        $destinationLong,
        $actualWeightKg,
        $volumeM3
    );

    $pdo->beginTransaction();
    $orderStatement = $pdo->prepare(
        'INSERT INTO orders
            (client_id, route_id, origin_lat, origin_long, dest_lat, dest_long, status, attempt, total_price)
         VALUES
            (:client_id, NULL, :origin_lat, :origin_long, :dest_lat, :dest_long, :status, 0, :total_price)'
    );
    $orderStatement->execute([
        'client_id' => $clientId,
        'origin_lat' => $originLat,
        'origin_long' => $originLong,
        'dest_lat' => $destinationLat,
        'dest_long' => $destinationLong,
        'status' => 'pending',
        'total_price' => $quote['total_price'],
    ]);
    $orderId = (int) $pdo->lastInsertId();

    $productStatement = $pdo->prepare(
        'INSERT INTO products (order_id, description, category, weight_kg, volume_m3)
         VALUES (:order_id, :description, :category, :weight_kg, :volume_m3)'
    );
    foreach ($normalizedProducts as $product) {
        $productStatement->execute([
            'order_id' => $orderId,
            'description' => $product['description'],
            'category' => $product['category'],
            'weight_kg' => $product['weight_kg'],
            'volume_m3' => $product['volume_m3'],
        ]);
    }

    $statusLogStatement = $pdo->prepare(
        'INSERT INTO order_status_log (order_id, changed_by_user_id, status_name)
         VALUES (:order_id, :changed_by_user_id, :status_name)'
    );
    $statusLogStatement->execute([
        'order_id' => $orderId,
        'changed_by_user_id' => $clientId,
        'status_name' => 'pending',
    ]);
    $pdo->commit();

    movioRespond(201, [
        'order_id' => $orderId,
        'status' => 'pending',
        'currency' => 'EUR',
        'quote' => $quote,
    ]);
} catch (InvalidArgumentException $exception) {
    movioRespond(422, ['error' => $exception->getMessage()]);
} catch (OsrmRouteDistanceException $exception) {
    movioRespond(502, ['error' => 'Could not calculate a road route. Please try again.']);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not create the order.']);
} catch (RuntimeException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Pricing service is not configured correctly.']);
}
