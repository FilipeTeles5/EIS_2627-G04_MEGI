<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

// List accounts and apply Admin decisions to pending Staff applications.
movioRequireRole('admin');
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'PUT'], true)) {
    header('Allow: GET, PUT');
    movioRespond(405, ['error' => 'Method not allowed. Use GET or PUT.']);
}

try {
    $pdo = movioDatabase();

    if ($method === 'GET') {
        $statement = $pdo->query(
            'SELECT user_id, username, email, name, phone, role, approved_status, created_at
             FROM users
             ORDER BY created_at DESC, user_id DESC'
        );
        movioRespond(200, ['users' => $statement->fetchAll()]);
    }

    $request = movioReadJsonRequest();
    $userId = filter_var($request['user_id'] ?? null, FILTER_VALIDATE_INT);
    $decision = $request['decision'] ?? null;
    if ($userId === false || $userId === null || $userId < 1) {
        movioRespond(422, ['error' => 'A valid user ID is required.']);
    }
    if (!is_string($decision) || !in_array($decision, ['approved', 'rejected'], true)) {
        movioRespond(422, ['error' => 'Decision must be approved or rejected.']);
    }

    $reviewComment = $decision === 'approved'
        ? 'Application approved by an administrator.'
        : 'Application rejected by an administrator.';
    $update = $pdo->prepare(
        'UPDATE users
         SET approved_status = :approved_status, review_comment = :review_comment
         WHERE user_id = :user_id AND role = :role AND approved_status = :pending_status'
    );
    $update->execute([
        'approved_status' => $decision,
        'review_comment' => $reviewComment,
        'user_id' => $userId,
        'role' => 'staff',
        'pending_status' => 'pending',
    ]);

    if ($update->rowCount() === 0) {
        $lookup = $pdo->prepare(
            'SELECT role, approved_status FROM users WHERE user_id = :user_id'
        );
        $lookup->execute(['user_id' => $userId]);
        $current = $lookup->fetch();
        if ($current === false || $current['role'] !== 'staff') {
            movioRespond(404, ['error' => 'Staff application was not found.']);
        }
        movioRespond(409, ['error' => 'This Staff application is no longer pending.']);
    }

    movioRespond(200, ['user_id' => $userId, 'approved_status' => $decision]);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    movioRespond(500, ['error' => 'Could not access user accounts.']);
}
