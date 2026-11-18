<?php
declare(strict_types=1);

use Movio\Services\OsrmRouteDistance;
use Movio\Services\OsrmRouteDistanceException;
use Movio\Services\PricingService;

require_once dirname(__DIR__, 2) . '/src/Services/OsrmRouteDistance.php';
require_once dirname(__DIR__, 2) . '/src/Services/PriceCalculator.php';
require_once dirname(__DIR__, 2) . '/src/Services/PricingService.php';

header('Content-Type: application/json; charset=utf-8');

$respond = static function (int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
};

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    $respond(405, ['error' => 'Method not allowed. Use POST.']);
}

try {
    $requestBody = file_get_contents('php://input');
    if ($requestBody === false) {
        $respond(400, ['error' => 'Could not read the request body.']);
    }

    $trimmedBody = ltrim($requestBody);
    if ($trimmedBody === '' || $trimmedBody[0] !== '{') {
        $respond(400, ['error' => 'Request body must be a JSON object.']);
    }

    $request = json_decode($requestBody, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $exception) {
    $respond(400, ['error' => 'Request body must contain valid JSON.']);
}

if (!is_array($request)) {
    $respond(400, ['error' => 'Request body must be a JSON object.']);
}

$readNumber = static function (array $source, string $key, float $minimum = 0.0): float {
    $value = $source[$key] ?? null;
    if ((!is_int($value) && !is_float($value) && !is_string($value)) || !is_numeric($value)) {
        throw new InvalidArgumentException($key . ' must be a number.');
    }

    $number = (float) $value;
    if (!is_finite($number) || $number < $minimum) {
        throw new InvalidArgumentException($key . ' is outside its valid range.');
    }

    return $number;
};

try {
    $originLat = $readNumber($request, 'origin_lat', -90.0);
    $originLong = $readNumber($request, 'origin_long', -180.0);
    $destinationLat = $readNumber($request, 'dest_lat', -90.0);
    $destinationLong = $readNumber($request, 'dest_long', -180.0);

    $products = $request['products'] ?? null;
    if (!is_array($products) || !array_is_list($products) || count($products) === 0 || count($products) > 50) {
        throw new InvalidArgumentException('Provide between 1 and 50 products.');
    }

    $actualWeightKg = 0.0;
    $volumeM3 = 0.0;
    foreach ($products as $product) {
        if (!is_array($product)) {
            throw new InvalidArgumentException('Each product must be an object.');
        }
        $actualWeightKg += $readNumber($product, 'weight_kg', 0.000001);
        $volumeM3 += $readNumber($product, 'volume_m3', 0.000001);
    }

    $pdo = require dirname(__DIR__, 2) . '/config/database.php';
    $quote = (new PricingService($pdo))->quote(
        $originLat,
        $originLong,
        $destinationLat,
        $destinationLong,
        $actualWeightKg,
        $volumeM3
    );

    $respond(200, ['currency' => 'EUR', 'quote' => $quote]);
} catch (InvalidArgumentException $exception) {
    $respond(422, ['error' => $exception->getMessage()]);
} catch (OsrmRouteDistanceException $exception) {
    error_log($exception->getMessage());
    $respond(502, ['error' => 'Could not calculate a road route. Please try again.']);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    $respond(500, ['error' => 'Pricing service could not access its configuration.']);
} catch (RuntimeException $exception) {
    error_log($exception->getMessage());
    $respond(500, ['error' => 'Pricing service is not configured correctly.']);
}
