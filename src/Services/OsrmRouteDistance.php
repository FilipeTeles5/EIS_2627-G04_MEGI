<?php
declare(strict_types=1);

namespace Movio\Services;

use InvalidArgumentException;
use JsonException;
use RuntimeException;

final class OsrmRouteDistance
{
    private string $baseUrl;

    public function __construct(?string $baseUrl = null)
    {
        // Allow a local/test router while defaulting to the public OSRM endpoint.
        $environmentUrl = getenv('OSRM_BASE_URL');
        $this->baseUrl = rtrim(
            $baseUrl ?? ($environmentUrl !== false && $environmentUrl !== ''
                ? $environmentUrl
                : 'https://router.project-osrm.org'),
            '/'
        );
    }

    public function distanceKm(
        float $originLat,
        float $originLong,
        float $destinationLat,
        float $destinationLong
    ): float {
        // OSRM expects longitude,latitude pairs and returns route distance in metres.
        $this->validateCoordinate($originLat, -90.0, 90.0, 'origin latitude');
        $this->validateCoordinate($destinationLat, -90.0, 90.0, 'destination latitude');
        $this->validateCoordinate($originLong, -180.0, 180.0, 'origin longitude');
        $this->validateCoordinate($destinationLong, -180.0, 180.0, 'destination longitude');

        $coordinates = implode(';', [
            number_format($originLong, 6, '.', '') . ',' . number_format($originLat, 6, '.', ''),
            number_format($destinationLong, 6, '.', '') . ',' . number_format($destinationLat, 6, '.', ''),
        ]);
        $url = $this->baseUrl . '/route/v1/driving/' . $coordinates
            . '?overview=false&alternatives=false&steps=false';

        $handle = curl_init($url);
        if ($handle === false) {
            throw new OsrmRouteDistanceException('Could not initialize the OSRM request.');
        }

        if (!curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_USERAGENT => 'Movio/1.0',
        ])) {
            $error = curl_error($handle);
            curl_close($handle);
            throw new OsrmRouteDistanceException('Could not configure the OSRM request: ' . $error);
        }

        $response = curl_exec($handle);
        $curlError = curl_error($handle);
        $httpStatus = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if ($response === false) {
            throw new OsrmRouteDistanceException('OSRM request failed: ' . $curlError);
        }
        if ($httpStatus < 200 || $httpStatus >= 300) {
            throw new OsrmRouteDistanceException('OSRM returned HTTP status ' . $httpStatus . '.');
        }

        try {
            $payload = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new OsrmRouteDistanceException('OSRM returned invalid JSON.', 0, $exception);
        }

        $route = is_array($payload) ? ($payload['routes'][0] ?? null) : null;
        if (
            !is_array($payload)
            || ($payload['code'] ?? null) !== 'Ok'
            || !is_array($route)
            || !isset($route['distance'])
            || !is_numeric($route['distance'])
            || !is_finite((float) $route['distance'])
            || (float) $route['distance'] < 0
        ) {
            $code = is_array($payload) ? (string) ($payload['code'] ?? 'unknown response') : 'unknown response';
            throw new OsrmRouteDistanceException('OSRM did not return a valid route: ' . $code);
        }

        return (float) $route['distance'] / 1000;
    }

    private function validateCoordinate(float $coordinate, float $minimum, float $maximum, string $name): void
    {
        if (!is_finite($coordinate) || $coordinate < $minimum || $coordinate > $maximum) {
            throw new InvalidArgumentException($name . ' is outside its valid range.');
        }
    }
}

final class OsrmRouteDistanceException extends RuntimeException
{
}
