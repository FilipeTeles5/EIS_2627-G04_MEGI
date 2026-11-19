<?php
declare(strict_types=1);

use Movio\Services\MockGatewayClient;
use Movio\Services\MockGatewayException;

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__, 2) . '/src/Services/MockGatewayClient.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    movioRespond(405, ['error' => 'Method not allowed. Use GET.']);
}

$clientId = movioRequireRole('client');
$jsonResponse = ($_GET['format'] ?? '') === 'json';
$paymentId = filter_var($_GET['payment_id'] ?? null, FILTER_VALIDATE_INT);
if ($paymentId === false || $paymentId === null || $paymentId < 1) {
    movioRespond(422, ['error' => 'payment_id must be a positive integer.']);
}

$appBaseUrl = getenv('APP_BASE_URL');
if ($appBaseUrl === false || filter_var($appBaseUrl, FILTER_VALIDATE_URL) === false) {
    error_log('Set APP_BASE_URL to the absolute URL of the Movio site.');
    movioRespond(503, ['error' => 'Payment return is not configured.']);
}
$returnUrlParts = parse_url($appBaseUrl);
if (!in_array($returnUrlParts['scheme'] ?? null, ['http', 'https'], true)) {
    error_log('APP_BASE_URL must use HTTP or HTTPS.');
    movioRespond(503, ['error' => 'Payment return is not configured.']);
}

$finish = static function (string $paymentStatus) use ($appBaseUrl, $jsonResponse, $paymentId): void {
    if ($jsonResponse) {
        movioRespond(200, ['payment_id' => $paymentId, 'status' => $paymentStatus]);
    }
    $target = rtrim($appBaseUrl, '/') . '/client-orders.html?payment=' . rawurlencode($paymentStatus);
    header('Location: ' . $target, true, 303);
    exit;
};

try {
    $pdo = movioDatabase();
    $paymentStatement = $pdo->prepare(
        'SELECT p.payment_id, p.amount, p.currency, p.status, p.gateway_reference,
                o.client_id
         FROM payments AS p
         JOIN orders AS o ON o.order_id = p.order_id
         WHERE p.payment_id = :payment_id AND o.client_id = :client_id'
    );
    $paymentStatement->execute(['payment_id' => $paymentId, 'client_id' => $clientId]);
    $payment = $paymentStatement->fetch();
    if ($payment === false) {
        movioRespond(404, ['error' => 'Payment not found.']);
    }
    if ($payment['status'] === 'confirmed') {
        $finish('confirmed');
    }
    if ($payment['status'] !== 'pending' || !is_string($payment['gateway_reference'])
        || $payment['gateway_reference'] === '') {
        $finish($payment['status']);
    }

    $gateway = new MockGatewayClient();
    $verification = $gateway->verifyPayment(
        $payment['gateway_reference'],
        (float) $payment['amount'],
        (string) $payment['currency']
    );
    $gatewayStatus = strtolower(trim($verification['txn_status']));
    $statusMap = [
        'success' => 'confirmed',
        'succeeded' => 'confirmed',
        'paid' => 'confirmed',
        'failed' => 'failed',
        'declined' => 'failed',
        'canceled' => 'cancelled',
        'cancelled' => 'cancelled',
        'pending' => 'pending',
        'processing' => 'pending',
    ];
    if (!isset($statusMap[$gatewayStatus])) {
        throw new MockGatewayException('MockGateway returned an unsupported payment status.');
    }
    $localStatus = $statusMap[$gatewayStatus];

    $updateStatement = $pdo->prepare(
        'UPDATE payments
         SET status = :status, completed_at = :completed_at
         WHERE payment_id = :payment_id AND status = :pending_status'
    );
    $updateStatement->execute([
        'status' => $localStatus,
        'completed_at' => $localStatus === 'pending' ? null : date('Y-m-d H:i:s'),
        'payment_id' => $paymentId,
        'pending_status' => 'pending',
    ]);

    $finish($localStatus);
} catch (MockGatewayException $exception) {
    error_log($exception->getMessage());
    if ($jsonResponse) {
        movioRespond(502, ['error' => 'Could not verify the payment.']);
    }
    $finish('verification_error');
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not verify the payment.']);
} catch (RuntimeException $exception) {
    error_log($exception->getMessage());
    if ($jsonResponse) {
        movioRespond(503, ['error' => 'Payment verification is not configured correctly.']);
    }
    $finish('verification_error');
}
