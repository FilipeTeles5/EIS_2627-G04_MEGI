<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, private');

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

function movioStartSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
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

function movioSetAuthenticatedSession(int $userId, string $role, string $name, string $email): void
{
    movioStartSession();
    if (!session_regenerate_id(true)) {
        movioRespond(500, ['error' => 'Could not establish the authenticated session.']);
    }

    $_SESSION = [
        'user_id' => $userId,
        'role' => $role,
        'name' => $name,
        'email' => $email,
    ];
}

function movioRequireRole(string $requiredRole): int
{
    movioStartSession();

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
