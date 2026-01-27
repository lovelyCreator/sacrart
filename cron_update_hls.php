<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

/**
 * Cron-friendly HLS URL updater
 * Gets fresh HLS URLs from Bunny.net embed pages and updates database
 * 
 * Usage: php cron_update_hls.php
 * Cron: 0 */12 * * * cd /path/to/project && php cron_update_hls.php
 */

// Initialize Laravel
try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $bunnyLibraryId = config('services.bunny.library_id');
} catch (Exception $e) {
    error_log("HLS Update Error: " . $e->getMessage());
    exit(1);
}

if (empty($bunnyLibraryId)) {
    error_log("HLS Update Error: Missing BUNNY_LIBRARY_ID configuration");
    exit(1);
}

// Get all video IDs from database
$tables = ['videos', 'reels', 'live_archive_videos'];
$allRecords = [];

foreach ($tables as $table) {
    $records = DB::table($table)
        ->whereNotNull('bunny_video_id')
        ->where('bunny_video_id', '!=', '')
        ->select('id', 'bunny_video_id')
        ->get();
    
    foreach ($records as $record) {
        $allRecords[] = [
            'table' => $table,
            'record_id' => $record->id,
            'bunny_video_id' => $record->bunny_video_id
        ];
    }
}

if (empty($allRecords)) {
    error_log("HLS Update: No records found with bunny_video_id");
    exit(0);
}

// Get unique video IDs and fetch fresh URLs
$uniqueVideoIds = array_unique(array_column($allRecords, 'bunny_video_id'));
$newHlsUrls = [];

function getWorkingHlsUrl($videoId, $libraryId) {
    $embedUrl = "https://iframe.mediadelivery.net/embed/{$libraryId}/{$videoId}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $embedUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) return null;
    
    $pattern = '/https:\/\/[^"\']+bcdn_token=[^"\'&]+[^"\']*playlist\.m3u8[^"\']*(?:[^"\']*)/';
    
    if (preg_match($pattern, $response, $matches)) {
        $url = preg_replace('/["\'\s].*$/', '', $matches[0]);
        
        // Test URL
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

foreach ($uniqueVideoIds as $videoId) {
    $hlsUrl = getWorkingHlsUrl($videoId, $bunnyLibraryId);
    if ($hlsUrl) {
        $newHlsUrls[$videoId] = $hlsUrl;
    }
    sleep(1); // Be respectful to the API
}

// Update database
$totalUpdated = 0;
$totalErrors = 0;

foreach ($allRecords as $record) {
    $table = $record['table'];
    $recordId = $record['record_id'];
    $videoId = $record['bunny_video_id'];
    
    if (isset($newHlsUrls[$videoId])) {
        try {
            $updated = DB::table($table)
                ->where('id', $recordId)
                ->update([
                    'bunny_hls_url' => $newHlsUrls[$videoId],
                    'updated_at' => now(),
                ]);
            
            if ($updated) {
                $totalUpdated++;
            }
            
        } catch (Exception $e) {
            $totalErrors++;
            error_log("HLS Update Database Error for {$table} ID {$recordId}: " . $e->getMessage());
        }
    } else {
        $totalErrors++;
        error_log("HLS Update: No URL found for video {$videoId}");
    }
}

// Log results
$message = "HLS URLs updated: {$totalUpdated} success, {$totalErrors} errors";
error_log($message);

exit($totalErrors > 0 ? 1 : 0);