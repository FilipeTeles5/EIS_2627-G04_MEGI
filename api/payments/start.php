<?php
declare(strict_types=1);

use Movio\Services\MockGatewayClient;
use Movio\Services\MockGatewayException;

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__, 2) . '/src/Services/MockGatewayClient.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    movioRespond(405, ['error' => 'Method not allowed. Use POST.']);
}

$clientId = movioRequireRole('client');
$request = movioReadJsonRequest();
$orderId = filter_var($request['order_id'] ?? null, FILTER_VALIDATE_INT);
if ($orderId === false || $orderId === null || $orderId < 1) {
    movioRespond(422, ['error' => 'order_id must be a positive integer.']);
}

try {
    $pdo = movioDatabase();
    $pdo->beginTransaction();

    $orderStatement = $pdo->prepare(
        'SELECT order_id, status, route_id, total_price
         FROM orders
         WHERE order_id = :order_id AND client_id = :client_id
         FOR UPDATE'
    );
    $orderStatement->execute(['order_id' => $orderId, 'client_id' => $clientId]);
    $order = $orderStatement->fetch();
    if ($order === false) {
        $pdo->rollBack();
        movioRespond(404, ['error' => 'Order not found.']);
    }
    if ($order['status'] !== 'pending' || $order['route_id'] !== null) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'Only unassigned pending orders can be paid.']);
    }

    $confirmedStatement = $pdo->prepare(
        'SELECT payment_id FROM payments
         WHERE order_id = :order_id AND status = :status
         LIMIT 1'
    );
    $confirmedStatement->execute(['order_id' => $orderId, 'status' => 'confirmed']);
    if ($confirmedStatement->fetchColumn() !== false) {
        $pdo->rollBack();
        movioRespond(409, ['error' => 'This order already has a confirmed payment.']);
    }

    $pendingStatement = $pdo->prepare(
        'SELECT payment_id, checkout_url, created_at
         FROM payments
         WHERE order_id = :order_id AND status = :status
         ORDER BY payment_id DESC
         LIMIT 1
         FOR UPDATE'
    );
    $pendingStatement->execute(['order_id' => $orderId, 'status' => 'pending']);
    $pendingPayment = $pendingStatement->fetch();
    if ($pendingPayment !== false) {
        if (is_string($pendingPayment['checkout_url']) && $pendingPayment['checkout_url'] !== '') {
            $pdo->commit();
            movioRespond(200, [
                'payment_id' => (int) $pendingPayment['payment_id'],
                'checkout_url' => $pendingPayment['checkout_url'],
                'status' => 'pending',
            ]);
        }

        $expireStatement = $pdo->prepare(
            'UPDATE payments
             SET status = :failed_status, completed_at = CURRENT_TIMESTAMP
             WHERE payment_id = :payment_id
               AND status = :pending_status
               AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)'
        );
        $expireStatement->execute([
            'failed_status' => 'failed',
            'payment_id' => $pendingPayment['payment_id'],
            'pending_status' => 'pending',
        ]);
        if ($expireStatement->rowCount() === 0) {
            $pdo->commit();
            movioRespond(409, ['error' => 'A payment attempt is still being initialized. Try again shortly.']);
        }
    }

    $gateway = new MockGatewayClient();
    $appBaseUrl = getenv('APP_BASE_URL');
    if ($appBaseUrl === false || filter_var($appBaseUrl, FILTER_VALIDATE_URL) === false) {
        $pdo->rollBack();
        throw new RuntimeException('Set APP_BASE_URL to the absolute URL of the Movio site.');
    }
    $returnUrlParts = parse_url($appBaseUrl);
    if (!in_array($returnUrlParts['scheme'] ?? null, ['http', 'https'], true)) {
        $pdo->rollBack();
        throw new RuntimeException('APP_BASE_URL must use HTTP or HTTPS.');
    }

    $insertStatement = $pdo->prepare(
        'INSERT INTO payments (order_id, amount, currency, status)
         VALUES (:order_id, :amount, :currency, :status)'
    );
    $insertStatement->execute([
        'order_id' => $orderId,
        'amount' => $order['total_price'],
        'currency' => 'EUR',
        'status' => 'pending',
    ]);
    $paymentId = (int) $pdo->lastInsertId();
    $pdo->commit();

    $returnUrl = rtrim($appBaseUrl, '/') . '/api/payments/return.php?payment_id=' . $paymentId;
    try {
        $gatewayPayment = $gateway->startPayment(
            (float) $order['total_price'],
            'EUR',
            'MOVIO-' . $orderId,
            $returnUrl
        );
    } catch (MockGatewayException $exception) {
        $failedStatement = $pdo->prepare(
            'UPDATE payments
             SET status = :status, completed_at = CURRENT_TIMESTAMP
             WHERE payment_id = :payment_id AND status = :pending_status'
        );
        $failedStatement->execute([
            'status' => 'failed',
            'payment_id' => $paymentId,
            'pending_status' => 'pending',
        ]);
        throw $exception;
    }

    $updateStatement = $pdo->prepare(
        'UPDATE payments
         SET gateway_reference = :gateway_reference, checkout_url = :checkout_url
         WHERE payment_id = :payment_id AND status = :status'
    );
    $updateStatement->execute([
        'gateway_reference' => $gatewayPayment['reference'],
        'checkout_url' => $gatewayPayment['checkout_url'],
        'payment_id' => $paymentId,
        'status' => 'pending',
    ]);
    if ($updateStatement->rowCount() !== 1) {
        throw new RuntimeException('The local payment attempt could not be updated.');
    }

    movioRespond(201, [
        'payment_id' => $paymentId,
        'checkout_url' => $gatewayPayment['checkout_url'],
        'status' => 'pending',
    ]);
} catch (MockGatewayException $exception) {
    error_log($exception->getMessage());
    movioRespond(502, ['error' => 'Could not start a payment with MockGateway.']);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not start the payment.']);
} catch (RuntimeException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($exception->getMessage());
    movioRespond(503, ['error' => 'Payment service is not configured correctly.']);
}
