<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Translation;

echo "Synchronizing support translations to database...\n\n";

// Load support translations from JSON files
$locales = ['en', 'es', 'pt'];
$basePath = __DIR__ . '/frontend/src/i18n/locales';

$totalSynced = 0;

foreach ($locales as $locale) {
    $filePath = "$basePath/$locale/translation.json";
    
    if (!file_exists($filePath)) {
        echo "❌ File not found: $filePath\n";
        continue;
    }
    
    $translations = json_decode(file_get_contents($filePath), true);
    
    if (!isset($translations['support'])) {
        echo "⚠ No 'support' key found in $locale translations\n";
        continue;
    }
    
    $supportTranslations = $translations['support'];
    $count = 0;
    
    foreach ($supportTranslations as $key => $value) {
        $fullKey = "support.$key";
        
        try {
            Translation::updateOrCreate(
                [
                    'key' => $fullKey,
                    'locale' => $locale,
                ],
                [
                    'value' => $value,
                    'group' => 'support',
                ]
            );
            $count++;
        } catch (\Exception $e) {
            echo "⚠ Error syncing $fullKey for $locale: " . $e->getMessage() . "\n";
        }
    }
    
    echo "✓ Synced $count support translations for $locale\n";
    $totalSynced += $count;
}

echo "\n✅ Total: $totalSynced support translations synchronized!\n";
echo "✅ Support translations synchronization complete!\n\n";

// Verify
echo "Verifying translations in database...\n";
foreach ($locales as $locale) {
    $count = Translation::where('locale', $locale)
        ->where('key', 'like', 'support.%')
        ->count();
    echo "  $locale: $count support translations found\n";
}

