<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Video;
use App\Models\Reel;

echo "=== Testing Audio Data ===\n\n";

// Check Videos
$video = Video::whereNotNull('audio_urls')->first();

if ($video) {
    echo "✅ Found Video with audio_urls:\n";
    echo "ID: {$video->id}\n";
    echo "Title: {$video->title}\n";
    echo "Audio URLs:\n";
    print_r($video->audio_urls);
    echo "\n";
} else {
    echo "❌ No videos found with audio_urls\n";
    echo "You need to process a video with 'Process Captions (AI)' in admin panel\n\n";
}

// Check Reels
$reel = Reel::whereNotNull('audio_urls')->first();

if ($reel) {
    echo "✅ Found Reel with audio_urls:\n";
    echo "ID: {$reel->id}\n";
    echo "Title: {$reel->title}\n";
    echo "Audio URLs:\n";
    print_r($reel->audio_urls);
    echo "\n";
} else {
    echo "❌ No reels found with audio_urls\n\n";
}

echo "\n=== Checking Video Structure ===\n\n";

if ($video) {
    echo "Video object structure:\n";
    echo "- bunny_video_id: " . ($video->bunny_video_id ?? 'NULL') . "\n";
    echo "- transcriptions: " . (is_array($video->transcriptions) ? count($video->transcriptions) . ' languages' : 'NULL') . "\n";
    echo "- caption_urls: " . (is_array($video->caption_urls) ? json_encode($video->caption_urls) : 'NULL') . "\n";
    echo "- audio_urls: " . (is_array($video->audio_urls) ? json_encode($video->audio_urls) : 'NULL') . "\n";
}

echo "\n✅ Done!\n";

