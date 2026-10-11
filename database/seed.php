<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use App\Model\Panel;

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

// Create panel user
echo "👤 Creating admin user...\n";

$panelEmail = 'panel@example.com';
$panelPassword = getenv('PANEL_PASSWORD');
if (!$adminPassword) {
    fwrite(STDERR, "ERROR: set PANEL_PASSWORD di .env sebelum menjalankan seeder.\n");
    exit(1);
}
$panelName = 'Gigih';

$existingPanel = Panel::where('email', $adminEmail)->first();

if ($existingAdmin) {
    echo "  Panel user already exists: {$adminEmail}\n";
} else {
    $panel = new Panel();
    $panel->email = $adminEmail;
    $panel->setPassword($adminPassword);
    $panel->name = $adminName;
    $panel->save();
    
    echo "  ✅ Admin created successfully!\n";
    echo "  📧 Email: {$adminEmail}\n";
    echo "  🔑 Password: {$adminPassword}\n";
    echo "  ⚠️  IMPORTANT: Change the password after first login!\n";
}

echo "\n🎉 Setup complete! You can now access the admin panel at /admin/login\n";
