<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    movioRespond(405, ['error' => 'Method not allowed. Use POST.']);
}

$request = movioReadJsonRequest();
$email = $request['email'] ?? null;
$password = $request['password'] ?? null;
if (!is_string($email) || !is_string($password)) {
    movioRespond(422, ['error' => 'Email and password are required.']);
}

$email = strtolower(trim($email));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '' || strlen($password) > 4096) {
    movioRespond(422, ['error' => 'Enter a valid email and password.']);
}

try {
    $pdo = movioDatabase();
    $statement = $pdo->prepare(
        'SELECT user_id, username, password_hash, email, name, role, approved_status
         FROM users
         WHERE email = :email'
    );
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();
    if ($user === false || !password_verify($password, $user['password_hash'])) {
        movioRespond(401, ['error' => 'The email or password is incorrect.']);
    }

    if ($user['approved_status'] !== 'approved') {
        $message = $user['approved_status'] === 'pending'
            ? 'This account is awaiting approval.'
            : 'This account is not approved for access.';
        movioRespond(403, ['error' => $message]);
    }

    movioSetAuthenticatedSession(
        (int) $user['user_id'],
        $user['role'],
        $user['name'],
        $user['email']
    );

    movioRespond(200, [
        'user' => [
            'user_id' => (int) $user['user_id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ],
    ]);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not sign in at this time.']);
}
