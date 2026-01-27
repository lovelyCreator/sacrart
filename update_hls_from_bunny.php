<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

/**
 * Update HLS URLs from Bunny.net
 * 1. Get video IDs from database
 * 2. Extract working HLS URLs from Bunny.net embed pages
 * 3. Update database with fresh URLs
 */

echo "=== Update HLS URLs from Bunny.net ===\n\n";

// Initialize Laravel
try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo "✓ Laravel initialized\n";
} catch (Exception $e) {
    echo "❌ Failed to initialize Laravel: " . $e->getMessage() . "\n";
    exit(1);
}

// Get Bunny.net configuration
$bunnyLibraryId = config('services.bunny.library_id');

if (empty($bunnyLibraryId)) {
    echo "❌ Missing BUNNY_LIBRARY_ID configuration\n";
    exit(1);
}

echo "✓ Bunny Library ID: {$bunnyLibraryId}\n\n";

echo "--- Step 1: Getting Video IDs from Database ---\n";

$tables = ['videos', 'reels', 'live_archive_videos'];
$allRecords = [];

foreach ($tables as $table) {
    $records = DB::table($table)
        ->whereNotNull('bunny_video_id')
        ->where('bunny_video_id', '!=', '')
        ->select('id', 'title', 'bunny_video_id')
        ->get();
    
    foreach ($records as $record) {
        $allRecords[] = [
            'table' => $table,
            'record_id' => $record->id,
            'title' => $record->title,
            'bunny_video_id' => $record->bunny_video_id
        ];
    }
}

echo "Found " . count($allRecords) . " records with bunny_video_id\n";

// Get unique video IDs
$uniqueVideoIds = array_unique(array_column($allRecords, 'bunny_video_id'));
echo "Unique video IDs: " . count($uniqueVideoIds) . "\n";

foreach ($uniqueVideoIds as $videoId) {
    echo "- {$videoId}\n";
}

/**
 * Extract working HLS URL from Bunny.net embed page
 */
function getWorkingHlsUrl($videoId, $libraryId) {
    $embedUrl = "https://iframe.mediadelivery.net/embed/{$libraryId}/{$videoId}";
    
    // Fetch embed page
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $embedUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error || $httpCode !== 200) {
        return null;
    }
    
    // Extract HLS URL with bcdn_token
    $pattern = '/https:\/\/[^"\']+bcdn_token=[^"\'&]+[^"\']*playlist\.m3u8[^"\']*(?:[^"\']*)/';
    
    if (preg_match($pattern, $response, $matches)) {
        $url = preg_replace('/["\'\s].*$/', '', $matches[0]);
        
        // Test if URL works
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        curl_exec($ch);
        $testHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($testHttpCode === 200) {
            return $url;
        }
    }
    
    return null;
}

echo "\n--- Step 2: Getting Fresh HLS URLs from Bunny.net ---\n";

$newHlsUrls = [];

foreach ($uniqueVideoIds as $videoId) {
    echo "Processing video ID: {$videoId}\n";
    
    $hlsUrl = getWorkingHlsUrl($videoId, $bunnyLibraryId);
    
    if ($hlsUrl) {
        $newHlsUrls[$videoId] = $hlsUrl;
        echo "  ✅ Got working HLS URL: " . substr($hlsUrl, 0, 80) . "...\n";
    } else {
        echo "  ❌ Failed to get working HLS URL\n";
    }
    
    // Small delay to be respectful to the API
    sleep(1);
}

echo "\nGenerated " . count($newHlsUrls) . " new HLS URLs\n";

if (empty($newHlsUrls)) {
    echo "❌ No HLS URLs obtained. Exiting.\n";
    exit(1);
}

echo "\n--- Step 3: Updating Database ---\n";

$stats = [
    'videos' => ['updated' => 0, 'errors' => 0],
    'reels' => ['updated' => 0, 'errors' => 0],
    'live_archive_videos' => ['updated' => 0, 'errors' => 0],
];

foreach ($allRecords as $record) {
    $table = $record['table'];
    $recordId = $record['record_id'];
    $title = $record['title'];
    $videoId = $record['bunny_video_id'];
    
    echo "\nUpdating {$table} ID {$recordId}: {$title}\n";
    echo "  Video ID: {$videoId}\n";
    
    if (isset($newHlsUrls[$videoId])) {
        $newUrl = $newHlsUrls[$videoId];
        
        echo "  🔗 New URL: " . substr($newUrl, 0, 80) . "...\n";
        
        try {
            $updated = DB::table($table)
                ->where('id', $recordId)
                ->update([
                    'bunny_hls_url' => $newUrl,
                    'updated_at' => now(),
                ]);
            
            if ($updated) {
                echo "  ✅ Updated successfully\n";
                $stats[$table]['updated']++;
            } else {
                echo "  ❌ Database update failed\n";
                $stats[$table]['errors']++;
            }
            
        } catch (Exception $e) {
            echo "  ❌ Error updating: " . $e->getMessage() . "\n";
            $stats[$table]['errors']++;
        }
        
    } else {
        echo "  ❌ No new HLS URL available for this video ID\n";
        $stats[$table]['errors']++;
    }
}

echo "\n=== Final Results ===\n";

$totalUpdated = 0;
$totalErrors = 0;

foreach ($stats as $table => $tableStats) {
    echo "{$table}: {$tableStats['updated']} updated, {$tableStats['errors']} errors\n";
    $totalUpdated += $tableStats['updated'];
    $totalErrors += $tableStats['errors'];
}

echo "\nTotal: {$totalUpdated} updated, {$totalErrors} errors\n";

if ($totalUpdated > 0) {
    echo "\n✅ Successfully updated {$totalUpdated} HLS URLs with working bcdn_token format!\n";
    echo "\nThe URLs are now in the correct format:\n";
    echo "https://vz-0cc8af54-835.b-cdn.net/bcdn_token=...&expires=...&token_path=.../playlist.m3u8\n";
} else {
    echo "\n⚠️  No URLs were updated.\n";
}

if ($totalErrors > 0) {
    echo "⚠️  {$totalErrors} errors occurred.\n";
}

echo "\n=== Update Complete ===\n";

?>