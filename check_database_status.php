<?php
/**
 * Quick Database Status Check Script
 * 
 * Run this on your VPS to check current database structure before migration
 * 
 * Usage: php check_database_status.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "=== Database Status Check ===\n\n";

// Check series table
echo "1. Series Table:\n";
if (Schema::hasTable('series')) {
    echo "   ✓ Series table EXISTS\n";
    $seriesCount = DB::table('series')->count();
    echo "   - Total series: {$seriesCount}\n";
} else {
    echo "   ✗ Series table DOES NOT EXIST (will be created by migration)\n";
}

// Check videos table structure
echo "\n2. Videos Table Structure:\n";
if (Schema::hasColumn('videos', 'category_id')) {
    echo "   ✓ Has 'category_id' column (will be renamed to 'series_id')\n";
    $videosWithCategory = DB::table('videos')->whereNotNull('category_id')->count();
    echo "   - Videos with category_id: {$videosWithCategory}\n";
} else {
    echo "   ✗ Does NOT have 'category_id' column\n";
}

if (Schema::hasColumn('videos', 'series_id')) {
    echo "   ✓ Has 'series_id' column\n";
    $videosWithSeries = DB::table('videos')->whereNotNull('series_id')->count();
    $videosWithoutSeries = DB::table('videos')->whereNull('series_id')->count();
    echo "   - Videos with series_id: {$videosWithSeries}\n";
    echo "   - Videos without series_id: {$videosWithoutSeries}\n";
    
    if ($videosWithoutSeries > 0) {
        echo "   ⚠ WARNING: {$videosWithoutSeries} videos need series_id assignment!\n";
    }
} else {
    echo "   ✗ Does NOT have 'series_id' column (will be created/renamed by migration)\n";
}

// Check user_progress table
echo "\n3. User Progress Table Structure:\n";
if (Schema::hasColumn('user_progress', 'category_id')) {
    echo "   ✓ Has 'category_id' column (will be renamed to 'series_id')\n";
} else {
    echo "   ✗ Does NOT have 'category_id' column\n";
}

if (Schema::hasColumn('user_progress', 'series_id')) {
    echo "   ✓ Has 'series_id' column\n";
} else {
    echo "   ✗ Does NOT have 'series_id' column (will be created/renamed by migration)\n";
}

// Check categories
echo "\n4. Categories:\n";
$categoryCount = DB::table('categories')->count();
echo "   - Total categories: {$categoryCount}\n";

// Check videos
echo "\n5. Videos:\n";
$videoCount = DB::table('videos')->count();
echo "   - Total videos: {$videoCount}\n";

// Check site_settings
echo "\n6. Site Settings:\n";
if (Schema::hasTable('site_settings')) {
    echo "   ✓ Site settings table EXISTS\n";
    $settingsCount = DB::table('site_settings')->count();
    echo "   - Total settings: {$settingsCount}\n";
} else {
    echo "   ✗ Site settings table DOES NOT EXIST\n";
}

// Check content_translations
echo "\n7. Content Translations:\n";
if (Schema::hasTable('content_translations')) {
    echo "   ✓ Content translations table EXISTS\n";
    $translationsCount = DB::table('content_translations')->count();
    echo "   - Total translations: {$translationsCount}\n";
} else {
    echo "   ✗ Content translations table DOES NOT EXIST\n";
}

// Migration readiness check
echo "\n=== Migration Readiness ===\n";

$ready = true;
$warnings = [];

if (Schema::hasColumn('videos', 'category_id')) {
    // Check if videos have valid category_id that can be converted to series
    $videosWithCategory = DB::table('videos')
        ->whereNotNull('category_id')
        ->whereNotIn('category_id', function($query) {
            $query->select('id')->from('categories');
        })
        ->count();
    
    if ($videosWithCategory > 0) {
        $warnings[] = "{$videosWithCategory} videos have invalid category_id references";
        $ready = false;
    }
}

if ($ready && Schema::hasColumn('videos', 'category_id')) {
    // Check if we need to create series for existing categories
    // Only check if series table exists
    if (Schema::hasTable('series')) {
        try {
            $categoriesWithoutSeries = DB::table('categories')
                ->whereNotExists(function($query) {
                    $query->select(DB::raw(1))
                          ->from('series')
                          ->whereColumn('series.category_id', 'categories.id');
                })
                ->count();
            
            if ($categoriesWithoutSeries > 0) {
                echo "⚠ WARNING: {$categoriesWithoutSeries} categories don't have series.\n";
                echo "   You may need to create series for these categories before migration.\n";
                echo "   See Step 6 in VPS_DATABASE_UPDATE_GUIDE.md\n";
            }
        } catch (\Exception $e) {
            // Series table doesn't exist yet, which is expected before migration
            echo "ℹ INFO: Series table doesn't exist yet (will be created by migration).\n";
            echo "   After migration, you'll need to create series for existing categories.\n";
            echo "   See Step 6 in VPS_DATABASE_UPDATE_GUIDE.md\n";
        }
    } else {
        // Series table doesn't exist yet, which is expected before migration
        echo "ℹ INFO: Series table doesn't exist yet (will be created by migration).\n";
        echo "   After migration, you'll need to create series for existing categories.\n";
        echo "   See Step 6 in VPS_DATABASE_UPDATE_GUIDE.md\n";
    }
}

if ($ready) {
    echo "✓ Database is ready for migration!\n";
    echo "\nNext steps:\n";
    echo "1. Backup database: mysqldump -u user -p database > backup.sql\n";
    echo "2. Run migration: php artisan migrate\n";
    echo "3. Clear caches: php artisan cache:clear && php artisan config:clear\n";
} else {
    echo "✗ Database has issues that need to be fixed before migration.\n";
    foreach ($warnings as $warning) {
        echo "  - {$warning}\n";
    }
}

echo "\n=== End of Check ===\n";

