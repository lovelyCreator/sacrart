<?php

/**
 * Script to create a new admin user
 * 
 * Usage: php create_admin.php
 * Or with custom credentials: php create_admin.php email@example.com password123
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Get email and password from command line arguments or use defaults
$email = $argv[1] ?? 'admin@ana.com';
$password = $argv[2] ?? 'password';
$name = $argv[3] ?? 'Admin User';

echo "Creating admin user...\n";
echo "Email: $email\n";
echo "Password: $password\n";
echo "Name: $name\n\n";

// Check if user already exists
$existingUser = User::where('email', $email)->first();

if ($existingUser) {
    echo "⚠️  User with email '$email' already exists!\n";
    echo "Do you want to update it to admin? (y/n): ";
    $handle = fopen("php://stdin", "r");
    $line = fgets($handle);
    fclose($handle);
    
    if (trim(strtolower($line)) !== 'y') {
        echo "❌ Cancelled.\n";
        exit(1);
    }
    
    // Update existing user to admin
    $existingUser->update([
        'name' => $name,
        'password' => Hash::make($password),
        'role' => 'admin',
        'subscription_type' => 'admin',
        'email_verified_at' => now(),
    ]);
    
    echo "✅ Admin user updated successfully!\n";
    echo "\nCredentials:\n";
    echo "Email: $email\n";
    echo "Password: $password\n";
    exit(0);
}

// Create new admin user
try {
    $user = User::create([
        'name' => $name,
        'email' => $email,
        'password' => Hash::make($password),
        'role' => 'admin',
        'subscription_type' => 'admin',
        'email_verified_at' => now(),
    ]);
    
    echo "✅ Admin user created successfully!\n";
    echo "\nCredentials:\n";
    echo "Email: $email\n";
    echo "Password: $password\n";
    echo "\nYou can now login with these credentials.\n";
    
} catch (\Exception $e) {
    echo "❌ Error creating admin user: " . $e->getMessage() . "\n";
    exit(1);
}

