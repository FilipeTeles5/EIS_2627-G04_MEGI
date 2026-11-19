<?php
declare(strict_types=1);

namespace Movio\Services;

use InvalidArgumentException;
use UnexpectedValueException;

final class PriceCalculator
{
    private const VOLUMETRIC_FACTOR_KG_PER_M3 = 200.0;

    // Apply the assignment formula and return the component values used in the quote.
    public function calculate(
        float $distanceKm,
        float $actualWeightKg,
        float $volumeM3,
        array $pricingConfig
    ): array {
        $this->validateNonNegative($distanceKm, 'distance');
        $this->validateNonNegative($actualWeightKg, 'actual weight');
        $this->validateNonNegative($volumeM3, 'volume');

        $feeBase = $this->configValue($pricingConfig, 'fee_base');
        $rateKm = $this->configValue($pricingConfig, 'rate_km');
        $rateKg = $this->configValue($pricingConfig, 'rate_kg');
        // Charge by whichever is greater: physical weight or volumetric weight.
        $volumetricWeightKg = $volumeM3 * self::VOLUMETRIC_FACTOR_KG_PER_M3;
        $chargeableWeightKg = max($actualWeightKg, $volumetricWeightKg);
        $distanceCharge = $distanceKm * $rateKm;
        $weightCharge = $chargeableWeightKg * $rateKg;

        return [
            'distance_km' => $distanceKm,
            'actual_weight_kg' => $actualWeightKg,
            'volume_m3' => $volumeM3,
            'volumetric_weight_kg' => $volumetricWeightKg,
            'chargeable_weight_kg' => $chargeableWeightKg,
            'fee_base' => $feeBase,
            'distance_charge' => round($distanceCharge, 2, PHP_ROUND_HALF_UP),
            'weight_charge' => round($weightCharge, 2, PHP_ROUND_HALF_UP),
            'total_price' => round($feeBase + $distanceCharge + $weightCharge, 2, PHP_ROUND_HALF_UP),
        ];
    }

    private function configValue(array $pricingConfig, string $key): float
    {
        if (!isset($pricingConfig[$key]) || !is_numeric($pricingConfig[$key])) {
            throw new UnexpectedValueException('Pricing configuration is missing a valid ' . $key . '.');
        }

        $value = (float) $pricingConfig[$key];
        if (!is_finite($value) || $value < 0) {
            throw new UnexpectedValueException('Pricing configuration has an invalid ' . $key . '.');
        }

        return $value;
    }

    private function validateNonNegative(float $value, string $name): void
    {
        if (!is_finite($value) || $value < 0) {
            throw new InvalidArgumentException($name . ' must be a non-negative finite number.');
        }
    }
}
