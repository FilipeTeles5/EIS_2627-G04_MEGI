<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

$adminId = movioRequireRole('admin');
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'PUT'], true)) {
    header('Allow: GET, PUT');
    movioRespond(405, ['error' => 'Method not allowed. Use GET or PUT.']);
}

if ($method === 'PUT') {
    $request = movioReadJsonRequest();
    try {
        $feeBase = movioReadNumber($request, 'fee_base');
        $rateKm = movioReadNumber($request, 'rate_km');
        $rateKg = movioReadNumber($request, 'rate_kg');
    } catch (InvalidArgumentException $exception) {
        movioRespond(422, ['error' => $exception->getMessage()]);
    }
}

try {
    $pdo = movioDatabase();
    if ($method === 'GET') {
        $statement = $pdo->prepare(
            'SELECT fee_base, rate_km, rate_kg, updated_at
             FROM pricing_config
             WHERE config_id = :config_id'
        );
        $statement->execute(['config_id' => 1]);
        $configuration = $statement->fetch();
        if ($configuration === false) {
            movioRespond(404, ['error' => 'Pricing configuration has not been seeded.']);
        }
        movioRespond(200, ['currency' => 'EUR', 'pricing' => $configuration]);
    }

    $updateStatement = $pdo->prepare(
        'UPDATE pricing_config
         SET fee_base = :fee_base, rate_km = :rate_km, rate_kg = :rate_kg, updated_by = :updated_by
         WHERE config_id = :config_id'
    );
    $updateStatement->execute([
        'fee_base' => $feeBase,
        'rate_km' => $rateKm,
        'rate_kg' => $rateKg,
        'updated_by' => $adminId,
        'config_id' => 1,
    ]);
    if ($updateStatement->rowCount() === 0) {
        $existsStatement = $pdo->prepare(
            'SELECT config_id FROM pricing_config WHERE config_id = :config_id'
        );
        $existsStatement->execute(['config_id' => 1]);
        if ($existsStatement->fetchColumn() === false) {
            movioRespond(404, ['error' => 'Pricing configuration has not been seeded.']);
        }
    }

    movioRespond(200, [
        'currency' => 'EUR',
        'pricing' => [
            'fee_base' => number_format($feeBase, 2, '.', ''),
            'rate_km' => number_format($rateKm, 4, '.', ''),
            'rate_kg' => number_format($rateKg, 4, '.', ''),
        ],
    ]);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not access pricing configuration.']);
}
