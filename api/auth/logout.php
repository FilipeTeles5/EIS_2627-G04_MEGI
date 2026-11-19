<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

// Clear the authenticated session and expire its browser cookie.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    movioRespond(405, ['error' => 'Method not allowed. Use POST.']);
}

movioStartSession();
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $cookie = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $cookie['path'],
        'domain' => $cookie['domain'],
        'secure' => $cookie['secure'],
        'httponly' => $cookie['httponly'],
        'samesite' => $cookie['samesite'] ?? 'Lax',
    ]);
}

if (!session_destroy()) {
    movioRespond(500, ['error' => 'Could not end the authenticated session.']);
}

movioRespond(200, ['message' => 'Signed out.']);
