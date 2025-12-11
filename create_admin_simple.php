<?php

/**
 * Simple script to create/update admin user (non-interactive)
 * 
 * Usage: php create_admin_simple.php email@example.com password123
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

if (!isset($argv[1]) || !isset($argv[2])) {
    echo "Usage: php create_admin_simple.php <email> <password> [name]\n";
    echo "Example: php create_admin_simple.php admin@example.com mypassword123 \"Admin Name\"\n";
    exit(1);
}

$email = $argv[1];
$password = $argv[2];
$name = $argv[3] ?? 'Admin User';

echo "Creating/updating admin user...\n";

$user = User::updateOrCreate(
    ['email' => $email],
    [
        'name' => $name,
        'password' => Hash::make($password),
        'role' => 'admin',
        'subscription_type' => 'admin',
        'email_verified_at' => now(),
    ]
);

echo "✅ Admin user created/updated successfully!\n";
echo "\nCredentials:\n";
echo "Email: $email\n";
echo "Password: $password\n";
echo "Name: $name\n";
echo "\nYou can now login with these credentials.\n";

