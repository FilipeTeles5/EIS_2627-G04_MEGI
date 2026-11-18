<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function movioRespond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function movioReadJsonRequest(): array
{
    $body = file_get_contents('php://input');
    if ($body === false) {
        movioRespond(400, ['error' => 'Could not read the request body.']);
    }

    $trimmedBody = ltrim($body);
    if ($trimmedBody === '' || $trimmedBody[0] !== '{') {
        movioRespond(400, ['error' => 'Request body must be a JSON object.']);
    }

    try {
        $request = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        movioRespond(400, ['error' => 'Request body must contain valid JSON.']);
    }

    if (!is_array($request)) {
        movioRespond(400, ['error' => 'Request body must be a JSON object.']);
    }

    return $request;
}

function movioRequireRole(string $requiredRole): int
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $secureCookie = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secureCookie,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        if (!session_start()) {
            movioRespond(500, ['error' => 'Could not start the authenticated session.']);
        }
    }

    $userId = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
    $role = $_SESSION['role'] ?? null;
    if ($userId === false || $userId === null || $userId < 1 || !is_string($role)) {
        movioRespond(401, ['error' => 'Authentication is required.']);
    }
    if (strtolower($role) !== strtolower($requiredRole)) {
        movioRespond(403, ['error' => 'This account is not allowed to perform this action.']);
    }

    return $userId;
}

function movioDatabase(): PDO
{
    return require dirname(__DIR__) . '/config/database.php';
}

function movioReadNumber(array $source, string $key, float $minimum = 0.0): float
{
    $value = $source[$key] ?? null;
    if ((!is_int($value) && !is_float($value) && !is_string($value)) || !is_numeric($value)) {
        throw new InvalidArgumentException($key . ' must be a number.');
    }

    $number = (float) $value;
    if (!is_finite($number) || $number < $minimum) {
        throw new InvalidArgumentException($key . ' is outside its valid range.');
    }

    return $number;
}
