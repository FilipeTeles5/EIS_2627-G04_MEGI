<?php
declare(strict_types=1);

namespace Movio\Services;

use PDO;
use RuntimeException;

final class PricingService
{
    private PDO $pdo;
    private OsrmRouteDistance $routeDistance;
    private PriceCalculator $calculator;

    public function __construct(
        PDO $pdo,
        ?OsrmRouteDistance $routeDistance = null,
        ?PriceCalculator $calculator = null
    ) {
        $this->pdo = $pdo;
        $this->routeDistance = $routeDistance ?? new OsrmRouteDistance();
        $this->calculator = $calculator ?? new PriceCalculator();
    }

    public function quote(
        float $originLat,
        float $originLong,
        float $destinationLat,
        float $destinationLong,
        float $actualWeightKg,
        float $volumeM3
    ): array {
        $statement = $this->pdo->prepare(
            'SELECT fee_base, rate_km, rate_kg FROM pricing_config WHERE config_id = :config_id'
        );
        $statement->execute(['config_id' => 1]);
        $pricingConfig = $statement->fetch();
        if ($pricingConfig === false) {
            throw new RuntimeException('Pricing configuration is not initialized.');
        }

        $distanceKm = $this->routeDistance->distanceKm(
            $originLat,
            $originLong,
            $destinationLat,
            $destinationLong
        );

        return $this->calculator->calculate(
            $distanceKm,
            $actualWeightKg,
            $volumeM3,
            $pricingConfig
        );
    }
}
