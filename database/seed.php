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
echo "👤 Creating panel user...\n";

$panelEmail = 'panel@example.com';
$panelPassword = getenv('PANEL_PASSWORD');
if (!$panelPassword) {
    fwrite(STDERR, "ERROR: set PANEL_PASSWORD di .env sebelum menjalankan seeder.\n");
    exit(1);
}
$panelName = 'Gigih';

$existingPanel = Panel::where('email', $panelEmail)->first();

if ($existingPanel) {
    echo "  Panel user already exists: {$panelEmail}\n";
} else {
    $panel = new Panel();
    $panel->email = $panelEmail;
    $panel->setPassword($panelPassword);
    $panel->name = $panelName;
    $panel->save();
    
    echo "  ✅ Panel user created successfully!\n";
    echo "  📧 Email: {$panelEmail}\n";
    echo "  🔑 Password: {$panelPassword}\n";
    echo "  ⚠️  IMPORTANT: Change the password after first login!\n";
}

echo "\n🎉 Setup complete! You can now access the panel at /panel/login (path tersedia di .env)\n";
