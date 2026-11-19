<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'PUT'], true)) {
    header('Allow: GET, PUT');
    movioRespond(405, ['error' => 'Method not allowed. Use GET or PUT.']);
}

movioStartSession();
$role = $_SESSION['role'] ?? null;
if (!is_string($role) || !in_array($role, ['client', 'courier', 'staff', 'admin'], true)) {
    movioRespond(401, ['error' => 'Authentication is required.']);
}
$userId = movioRequireRole($role);

try {
    $pdo = movioDatabase();
    $profileStatement = $pdo->prepare(
        'SELECT username, email, name, phone, nif, role
         FROM users
         WHERE user_id = :user_id'
    );
    $profileStatement->execute(['user_id' => $userId]);
    $currentProfile = $profileStatement->fetch();
    if ($currentProfile === false) {
        movioRespond(404, ['error' => 'The account could not be found.']);
    }

    if ($method === 'GET') {
        movioRespond(200, ['user' => $currentProfile]);
    }

    $request = movioReadJsonRequest();
    $unexpectedFields = array_diff(array_keys($request), ['name', 'username', 'phone', 'nif']);
    if ($unexpectedFields) {
        movioRespond(422, ['error' => 'Only name, username, phone and NIF can be changed here.']);
    }

    $name = $request['name'] ?? null;
    $username = $request['username'] ?? null;
    $phone = $request['phone'] ?? '';
    $nif = $request['nif'] ?? '';
    if (
        !is_string($name) || !is_string($username) ||
        !is_string($phone) || !is_string($nif)
    ) {
        movioRespond(422, ['error' => 'Profile fields have an invalid format.']);
    }

    $name = trim($name);
    $username = strtolower(trim($username));
    $phone = trim($phone);
    $nif = trim($nif);

    $validNameLength = preg_match('/^.{1,120}$/us', $name) === 1;
    $hasNameControlCharacter = preg_match('/[\x00-\x1F\x7F]/u', $name) === 1;
    if (!$validNameLength || $hasNameControlCharacter) {
        movioRespond(422, ['error' => 'Enter a name of 1 to 120 characters.']);
    }
    if (!preg_match('/^[a-z0-9._-]{3,80}$/D', $username)) {
        movioRespond(422, [
            'error' => 'Username must be 3 to 80 letters, numbers, dots, underscores or hyphens.',
        ]);
    }

    $currentPhone = $currentProfile['phone'] ?? '';
    if (
        $phone !== '' &&
        !preg_match('/^[0-9]{9,15}$/D', $phone) &&
        $phone !== $currentPhone
    ) {
        movioRespond(422, ['error' => 'A new phone number must contain 9 to 15 digits.']);
    }
    if ($nif !== '' && !movioIsValidPortugueseNif($nif)) {
        movioRespond(422, ['error' => 'Enter a valid 9-digit Portuguese NIF or leave it blank.']);
    }

    $updateStatement = $pdo->prepare(
        'UPDATE users
         SET username = :username, name = :name, phone = :phone, nif = :nif
         WHERE user_id = :user_id'
    );
    $updateStatement->execute([
        'username' => $username,
        'name' => $name,
        'phone' => $phone === '' ? null : $phone,
        'nif' => $nif === '' ? null : $nif,
        'user_id' => $userId,
    ]);

    $_SESSION['name'] = $name;
    $profileStatement->execute(['user_id' => $userId]);
    movioRespond(200, ['user' => $profileStatement->fetch()]);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000' && (int) ($exception->errorInfo[1] ?? 0) === 1062) {
        movioRespond(409, ['error' => 'That username is already in use.']);
    }

    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not load or update your profile.']);
}
