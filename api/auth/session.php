<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    movioRespond(405, ['error' => 'Method not allowed. Use GET.']);
}

if (empty($_COOKIE[session_name()])) {
    movioRespond(200, ['user' => null]);
}

movioStartSession();
$userId = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
$role = $_SESSION['role'] ?? null;
$name = $_SESSION['name'] ?? null;
$email = $_SESSION['email'] ?? null;

if (
    $userId === false || $userId === null || $userId < 1 ||
    !is_string($role) || !is_string($name) || !is_string($email)
) {
    movioRespond(200, ['user' => null]);
}

movioRespond(200, [
    'user' => [
        'user_id' => $userId,
        'name' => $name,
        'email' => $email,
        'role' => $role,
    ],
]);
