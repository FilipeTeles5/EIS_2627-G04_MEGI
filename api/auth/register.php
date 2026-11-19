<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

// Validate and create a Client/Courier account or a pending Staff application.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    movioRespond(405, ['error' => 'Method not allowed. Use POST.']);
}

$request = movioReadJsonRequest();
$name = $request['name'] ?? null;
$username = $request['username'] ?? null;
$email = $request['email'] ?? null;
$phone = $request['phone'] ?? null;
$nif = $request['nif'] ?? null;
$role = $request['role'] ?? null;
$password = $request['password'] ?? null;

if (
    !is_string($name) || !is_string($username) || !is_string($email) ||
    !is_string($phone) || !is_string($nif) || !is_string($role) ||
    !is_string($password)
) {
    movioRespond(422, ['error' => 'Complete all required registration fields.']);
}

$name = trim($name);
$username = strtolower(trim($username));
$email = strtolower(trim($email));
$phone = trim($phone);
$nif = trim($nif);
$role = strtolower(trim($role));

if ($name === '' || strlen($name) > 480) {
    movioRespond(422, ['error' => 'Enter a name within the allowed length.']);
}
if (!preg_match('/^[a-z0-9._-]{3,80}$/D', $username)) {
    movioRespond(422, ['error' => 'Username must be 3 to 80 letters, numbers, dots, underscores or hyphens.']);
}
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    movioRespond(422, ['error' => 'Enter a valid email address.']);
}
if (!preg_match('/^[0-9]{9,15}$/D', $phone)) {
    movioRespond(422, ['error' => 'Phone must contain 9 to 15 digits.']);
}
if (!movioIsValidPortugueseNif($nif)) {
    movioRespond(422, ['error' => 'Enter a valid 9-digit Portuguese NIF.']);
}
if (!in_array($role, ['client', 'courier', 'staff'], true)) {
    movioRespond(422, ['error' => 'Choose a supported account type.']);
}
if (strlen($password) < 6 || strlen($password) > 72) {
    movioRespond(422, ['error' => 'Password must be between 6 and 72 characters.']);
}
if (str_contains($password, "\0")) {
    movioRespond(422, ['error' => 'Password contains an unsupported character.']);
}

$approvedStatus = $role === 'staff' ? 'pending' : 'approved';
$reviewComment = $role === 'staff' ? 'Application awaiting review.' : null;
$passwordHash = password_hash($password, PASSWORD_DEFAULT);
if (!is_string($passwordHash)) {
    movioRespond(500, ['error' => 'Could not secure the account password.']);
}

try {
    $pdo = movioDatabase();
    $statement = $pdo->prepare(
        'INSERT INTO users
            (username, password_hash, email, name, phone, nif, role, approved_status, review_comment)
         VALUES
            (:username, :password_hash, :email, :name, :phone, :nif, :role, :approved_status, :review_comment)'
    );
    $statement->execute([
        'username' => $username,
        'password_hash' => $passwordHash,
        'email' => $email,
        'name' => $name,
        'phone' => $phone,
        'nif' => $nif,
        'role' => $role,
        'approved_status' => $approvedStatus,
        'review_comment' => $reviewComment,
    ]);

    $user = [
        'user_id' => (int) $pdo->lastInsertId(),
        'username' => $username,
        'name' => $name,
        'email' => $email,
        'role' => $role,
    ];

    if ($role === 'staff') {
        movioRespond(202, [
            'pending' => true,
            'message' => 'Your Staff application has been submitted and is awaiting Admin approval.',
        ]);
    }

    movioSetAuthenticatedSession($user['user_id'], $role, $name, $email);
    movioRespond(201, ['user' => $user]);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000' && (int) ($exception->errorInfo[1] ?? 0) === 1062) {
        movioRespond(409, ['error' => 'That username or email is already registered.']);
    }

    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not create the account.']);
}
