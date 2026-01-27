<?php

require_once __DIR__ . '/vendor/autoload.php';

/**
 * Get video IDs from database
 */

echo "=== Getting Video IDs from Database ===\n\n";

try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    
    $tables = ['videos', 'reels', 'live_archive_videos'];
    $allVideoIds = [];
    
    foreach ($tables as $table) {
        echo "--- {$table} ---\n";
        
        $records = DB::table($table)
            ->whereNotNull('bunny_video_id')
            ->where('bunny_video_id', '!=', '')
            ->select('id', 'title', 'bunny_video_id')
            ->get();
        
        foreach ($records as $record) {
            echo "ID: {$record->id} | Title: {$record->title} | Bunny Video ID: {$record->bunny_video_id}\n";
            $allVideoIds[] = [
                'table' => $table,
                'record_id' => $record->id,
                'title' => $record->title,
                'bunny_video_id' => $record->bunny_video_id
            ];
        }
        echo "\n";
    }
    
    echo "=== Summary ===\n";
    echo "Total records with bunny_video_id: " . count($allVideoIds) . "\n";
    
    // Show unique video IDs
    $uniqueVideoIds = array_unique(array_column($allVideoIds, 'bunny_video_id'));
    echo "Unique bunny_video_ids: " . count($uniqueVideoIds) . "\n";
    
    echo "\nUnique Video IDs:\n";
    foreach ($uniqueVideoIds as $videoId) {
        echo "- {$videoId}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n=== Complete ===\n";