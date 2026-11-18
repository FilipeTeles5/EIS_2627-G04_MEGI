<?php
declare(strict_types=1);

namespace Movio\Services;

use JsonException;
use RuntimeException;

final class MockGatewayClient
{
    private string $baseUrl;
    private string $slug;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(getenv('MOCKGATEWAY_BASE_URL') ?: 'https://mockgateway.com/api/base', '/');
        $slug = getenv('MOCKGATEWAY_SLUG');
        $apiKey = getenv('MOCKGATEWAY_API_KEY');
        $baseUrlParts = parse_url($this->baseUrl);

        if (($baseUrlParts['scheme'] ?? null) !== 'https' || !isset($baseUrlParts['host'])) {
            throw new RuntimeException('MOCKGATEWAY_BASE_URL must use HTTPS.');
        }
        if ($slug === false || !preg_match('/^[a-zA-Z0-9-]+$/', $slug)) {
            throw new RuntimeException('Set a valid MOCKGATEWAY_SLUG in the PHP environment.');
        }
        if ($apiKey === false || trim($apiKey) === '' || preg_match('/[\r\n]/', $apiKey)) {
            throw new RuntimeException('Set MOCKGATEWAY_API_KEY in the PHP environment.');
        }

        $this->slug = $slug;
        $this->apiKey = $apiKey;
    }

    public function startPayment(
        float $amount,
        string $currency,
        string $orderReference,
        string $returnUrl
    ): array {
        if (!is_finite($amount) || $amount <= 0 || !preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new RuntimeException('The payment amount or currency is invalid.');
        }
        $returnUrlParts = parse_url($returnUrl);
        if (
            filter_var($returnUrl, FILTER_VALIDATE_URL) === false
            || !in_array($returnUrlParts['scheme'] ?? null, ['http', 'https'], true)
        ) {
            throw new RuntimeException('The payment return URL is invalid.');
        }

        $response = $this->request('POST', '/init', [
            'amount' => round($amount, 2, PHP_ROUND_HALF_UP),
            'currency' => $currency,
            'order_ref' => $orderReference,
            'success_redirect' => $returnUrl,
        ]);

        $reference = $response['txn_id'] ?? null;
        $checkoutUrl = $response['payment_url'] ?? null;
        if (!is_string($reference) || $reference === '' || strlen($reference) > 120
            || preg_match('/[\r\n]/', $reference) || !is_string($checkoutUrl)
            || strlen($checkoutUrl) > 2048 || filter_var($checkoutUrl, FILTER_VALIDATE_URL) === false) {
            throw new MockGatewayException('MockGateway did not return a transaction ID and checkout URL.');
        }

        $this->validateAmountAndCurrency($response, $amount, $currency);
        $url = parse_url($checkoutUrl);
        if (($url['scheme'] ?? null) !== 'https' || ($url['host'] ?? null) !== 'mockgateway.com') {
            throw new MockGatewayException('MockGateway returned an untrusted checkout URL.');
        }

        return ['reference' => $reference, 'checkout_url' => $checkoutUrl];
    }

    public function verifyPayment(string $reference, float $expectedAmount, string $currency): array
    {
        if ($reference === '' || strlen($reference) > 120 || preg_match('/[\r\n]/', $reference)) {
            throw new RuntimeException('The MockGateway transaction reference is missing.');
        }

        $response = $this->request('GET', '/verify/' . rawurlencode($reference));
        if (($response['txn_id'] ?? null) !== $reference) {
            throw new MockGatewayException('MockGateway verified a different transaction.');
        }
        $this->validateAmountAndCurrency($response, $expectedAmount, $currency);

        $status = $response['txn_status'] ?? null;
        if (!is_string($status) || trim($status) === '') {
            throw new MockGatewayException('MockGateway returned no transaction status.');
        }

        return $response;
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        if (!extension_loaded('curl')) {
            throw new MockGatewayException('The PHP cURL extension is required for MockGateway.');
        }

        $url = $this->baseUrl . '/' . rawurlencode($this->slug) . $path;
        $handle = curl_init($url);
        if ($handle === false) {
            throw new MockGatewayException('Could not initialize the MockGateway request.');
        }

        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Authorization: Bearer ' . $this->apiKey,
            ],
            CURLOPT_USERAGENT => 'Movio/1.0',
        ];
        if ($method === 'POST') {
            try {
                $jsonBody = json_encode($body, JSON_THROW_ON_ERROR);
            } catch (JsonException $exception) {
                curl_close($handle);
                throw new MockGatewayException('Could not encode the MockGateway request.', 0, $exception);
            }
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
            $options[CURLOPT_POSTFIELDS] = $jsonBody;
        } else {
            $options[CURLOPT_HTTPGET] = true;
        }

        if (!curl_setopt_array($handle, $options)) {
            $error = curl_error($handle);
            curl_close($handle);
            throw new MockGatewayException('Could not configure the MockGateway request: ' . $error);
        }

        $responseBody = curl_exec($handle);
        $curlError = curl_error($handle);
        $httpStatus = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if ($responseBody === false) {
            throw new MockGatewayException('MockGateway request failed: ' . $curlError);
        }
        if ($httpStatus < 200 || $httpStatus >= 300) {
            throw new MockGatewayException('MockGateway returned HTTP status ' . $httpStatus . '.');
        }

        try {
            $response = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new MockGatewayException('MockGateway returned invalid JSON.', 0, $exception);
        }
        if (!is_array($response)) {
            throw new MockGatewayException('MockGateway returned an invalid response.');
        }

        return $response;
    }

    private function validateAmountAndCurrency(array $response, float $expectedAmount, string $currency): void
    {
        $amount = $response['amount_charged'] ?? null;
        if (!is_numeric($amount) || abs(round((float) $amount, 2) - round($expectedAmount, 2)) > 0.001) {
            throw new MockGatewayException('MockGateway payment amount does not match the order total.');
        }
        if (isset($response['currency']) && strtoupper((string) $response['currency']) !== $currency) {
            throw new MockGatewayException('MockGateway payment currency does not match the order currency.');
        }
    }
}

final class MockGatewayException extends RuntimeException
{
}
