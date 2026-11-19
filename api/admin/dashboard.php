<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

// Return live route, order, and payment counts for an authenticated Admin.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    movioRespond(405, ['error' => 'Method not allowed. Use GET.']);
}

movioRequireRole('admin');

try {
    $pdo = movioDatabase();

    $routeCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM routes WHERE status IN ('planning', 'active')"
    )->fetchColumn();

    $orderStatement = $pdo->query(
        'SELECT status, COUNT(*) AS status_count FROM orders GROUP BY status'
    );
    $ordersByStatus = [];
    foreach ($orderStatement->fetchAll() as $row) {
        $status = $row['status'] === 'in_progress' ? 'in-progress' : $row['status'];
        $ordersByStatus[$status] = (int) $row['status_count'];
    }

    $paymentStatement = $pdo->query(
        'SELECT status, COUNT(*) AS status_count FROM payments GROUP BY status'
    );
    $paymentsByStatus = [];
    foreach ($paymentStatement->fetchAll() as $row) {
        $paymentsByStatus[$row['status']] = (int) $row['status_count'];
    }

    movioRespond(200, [
        'open_routes' => $routeCount,
        'orders_by_status' => $ordersByStatus,
        'payments_by_status' => $paymentsByStatus,
    ]);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not load the Admin dashboard.']);
}
