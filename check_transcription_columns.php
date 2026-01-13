<?php

/**
 * Script to check if transcription columns exist in videos table
 * Run: php check_transcription_columns.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "Checking transcription columns in videos table...\n\n";

$columns = Schema::getColumnListing('videos');

$requiredColumns = [
    'transcriptions',
    'caption_urls',
    'audio_urls',
    'source_language',
    'transcription_status',
    'transcription_error',
    'transcription_processed_at',
];

echo "Required columns:\n";
foreach ($requiredColumns as $col) {
    $exists = in_array($col, $columns);
    $status = $exists ? '✓ EXISTS' : '✗ MISSING';
    echo "  {$col}: {$status}\n";
}

echo "\nAll columns in videos table:\n";
foreach ($columns as $col) {
    $type = DB::select("SHOW COLUMNS FROM videos WHERE Field = ?", [$col]);
    if (!empty($type)) {
        $columnType = $type[0]->Type;
        echo "  {$col} ({$columnType})\n";
    }
}

// Check a sample video
echo "\n\nChecking sample video transcription data:\n";
$sampleVideo = DB::table('videos')->first();
if ($sampleVideo) {
    echo "Video ID: {$sampleVideo->id}\n";
    echo "Transcriptions: " . ($sampleVideo->transcriptions ?? 'NULL') . "\n";
    echo "Caption URLs: " . ($sampleVideo->caption_urls ?? 'NULL') . "\n";
    echo "Audio URLs: " . ($sampleVideo->audio_urls ?? 'NULL') . "\n";
    echo "Source Language: " . ($sampleVideo->source_language ?? 'NULL') . "\n";
    echo "Transcription Status: " . ($sampleVideo->transcription_status ?? 'NULL') . "\n";
} else {
    echo "No videos found in database.\n";
}
