<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use App\Model\Admin;

// Initialize database
Database::init();

echo "🌱 Running database migrations...\n";

// Run migrations
$migrationFiles = glob(__DIR__ . '/../migrations/*.php');
sort($migrationFiles);

foreach ($migrationFiles as $file) {
    echo "  Running: " . basename($file) . "\n";
    $migration = require $file;
    if (is_callable($migration)) {
        $migration();
    }
}

echo "✅ Migrations completed!\n\n";

// Create admin user
echo "👤 Creating admin user...\n";

$adminEmail = 'admin@example.com';
$adminPassword = getenv('ADMIN_PASSWORD');
if (!$adminPassword) {
    fwrite(STDERR, "ERROR: set ADMIN_PASSWORD di .env sebelum menjalankan seeder.\n");
    exit(1);
}
$adminName = 'Gigih';

$existingAdmin = Admin::where('email', $adminEmail)->first();

if ($existingAdmin) {
    echo "  Admin user already exists: {$adminEmail}\n";
} else {
    $admin = new Admin();
    $admin->email = $adminEmail;
    $admin->setPassword($adminPassword);
    $admin->name = $adminName;
    $admin->save();
    
    echo "  ✅ Admin created successfully!\n";
    echo "  📧 Email: {$adminEmail}\n";
    echo "  🔑 Password: {$adminPassword}\n";
    echo "  ⚠️  IMPORTANT: Change the password after first login!\n";
}

echo "\n🎉 Setup complete! You can now access the admin panel at /admin/login\n";
