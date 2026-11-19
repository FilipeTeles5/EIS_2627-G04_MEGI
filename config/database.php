<?php
declare(strict_types=1);

// Read local XAMPP defaults, allowing deployments to override each connection value.
$host = getenv('DB_HOST') ?: '127.0.0.1';
$database = getenv('DB_NAME') ?: 'movio';
$username = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS');

if ($password === false) {
    $password = '';
}

$dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $database);

// Return one PDO connection configured for exceptions and native prepared statements.
return new PDO($dsn, $username, $password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
