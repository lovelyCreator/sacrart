<?php

/**
 * Test script to extract duration and transcription from Bunny.net embed URL
 * 
 * Usage: php test_bunny_extract.php
 * 
 * This script tests:
 * 1. Extracting video ID from embed URL (including /play/ format)
 * 2. Fetching video metadata (duration, file size, etc.)
 * 3. Getting captions/transcriptions if available
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Bunny.net Video Extraction Test ===\n\n";

// Test URL from user
$testUrl = "https://iframe.mediadelivery.net/play/550816/dd32cfb3-12e6-481f-8c19-cfda69280ba4";

echo "Test URL: {$testUrl}\n\n";

// Get Bunny.net service
$bunnyService = app(\App\Services\BunnyNetService::class);

// Extract video ID from URL
echo "Step 1: Extracting video ID from URL...\n";

// Method to extract video ID (matching VideoController logic)
function extractBunnyVideoId(?string $embedUrl = null, ?string $videoId = null): ?string
{
    if ($videoId) {
        return $videoId;
    }

    if ($embedUrl) {
        // Format 1: https://iframe.mediadelivery.net/embed/{library}/{video}
        if (preg_match('/\/embed\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
            return $matches[1];
        }
        
        // Format 2: https://iframe.mediadelivery.net/play/{library}/{video}
        if (preg_match('/\/play\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
            return $matches[1];
        }
        
        // Format 3: https://vz-xxxxx.b-cdn.net/{video}/play_720p.mp4
        if (preg_match('/\/([a-f0-9\-]{36})\//', $embedUrl, $matches)) {
            return $matches[1];
        }
        
        // Format 4: Direct video ID in URL (UUID format)
        if (preg_match('/([a-f0-9\-]{36})/', $embedUrl, $matches)) {
            return $matches[1];
        }
    }

    return null;
}

$extractedVideoId = extractBunnyVideoId($testUrl);

if (!$extractedVideoId) {
    echo "❌ Failed to extract video ID from URL!\n";
    exit(1);
}

echo "✅ Extracted Video ID: {$extractedVideoId}\n\n";

// Fetch video metadata
echo "Step 2: Fetching video metadata from Bunny.net API...\n";

$result = $bunnyService->getVideo($extractedVideoId);

if (!$result['success']) {
    echo "❌ Failed to fetch video metadata!\n";
    echo "Error: " . ($result['error'] ?? 'Unknown error') . "\n";
    
    if (isset($result['status_code'])) {
        echo "HTTP Status: {$result['status_code']}\n";
        
        if ($result['status_code'] == 401) {
            echo "\n⚠️  Authentication failed. Please check your BUNNY_API_KEY in .env file.\n";
        } elseif ($result['status_code'] == 404) {
            echo "\n⚠️  Video not found. Please check if the video ID is correct.\n";
        }
    }
    
    exit(1);
}

echo "✅ Video metadata fetched successfully!\n\n";

// Display results
echo "=== Video Information ===\n\n";

$data = $result['data'];

// Duration
$duration = $result['duration'] ?? null;
if ($duration) {
    $hours = floor($duration / 3600);
    $minutes = floor(($duration % 3600) / 60);
    $seconds = $duration % 60;
    $formatted = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    echo "Duration: {$duration} seconds ({$formatted})\n";
} else {
    echo "Duration: Not available\n";
}

// File size
$fileSize = $result['file_size'] ?? null;
if ($fileSize) {
    $fileSizeMB = round($fileSize / 1024 / 1024, 2);
    echo "File Size: " . number_format($fileSize) . " bytes ({$fileSizeMB} MB)\n";
} else {
    echo "File Size: Not available\n";
}

// Thumbnail
$thumbnail = $result['thumbnail_url'] ?? null;
if ($thumbnail) {
    echo "Thumbnail URL: {$thumbnail}\n";
} else {
    echo "Thumbnail: Not available\n";
}

// Title
if (isset($data['title'])) {
    echo "Title: {$data['title']}\n";
}

// Video ID
if (isset($data['guid']) || isset($data['videoId'])) {
    $vidId = $data['guid'] ?? $data['videoId'] ?? null;
    echo "Video ID: {$vidId}\n";
}

echo "\n";

// Captions/Transcriptions
echo "=== Captions/Transcriptions ===\n\n";

$captions = $result['captions'] ?? $result['transcription'] ?? [];

if (!empty($captions)) {
    echo "✅ Found " . count($captions) . " caption(s)/transcription(s):\n\n";
    
    foreach ($captions as $index => $caption) {
        echo "Caption " . ($index + 1) . ":\n";
        echo "  Label: " . ($caption['label'] ?? 'N/A') . "\n";
        echo "  Language: " . ($caption['language'] ?? 'N/A') . "\n";
        
        if (isset($caption['url'])) {
            echo "  URL: {$caption['url']}\n";
        }
        
        if (isset($caption['text'])) {
            $textPreview = mb_substr($caption['text'], 0, 200);
            echo "  Text Preview: {$textPreview}...\n";
        }
        
        if (isset($caption['default']) && $caption['default']) {
            echo "  Default: Yes\n";
        }
        
        echo "\n";
    }
} else {
    echo "⚠️  No captions or transcriptions found.\n\n";
    echo "What this means:\n";
    echo "  • The video doesn't have captions uploaded yet in Bunny.net\n";
    echo "  • You CAN get transcriptions, but you need to:\n";
    echo "    1. Upload captions manually in Bunny.net dashboard, OR\n";
    echo "    2. Enable automatic transcription generation (if available in your plan)\n\n";
    echo "How to get transcriptions:\n";
    echo "  Option 1: Upload VTT/SRT file in Bunny.net dashboard\n";
    echo "  Option 2: Use Bunny.net's auto-transcription feature (if enabled)\n";
    echo "  Option 3: Generate transcriptions using third-party services\n";
    echo "           (OpenAI Whisper, Google Speech-to-Text, etc.)\n\n";
    echo "Note: The system is ready to extract transcriptions once captions are available.\n";
}

// Display full API response (for debugging)
echo "\n=== Full API Response (for debugging) ===\n";
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

echo "\n✅ Test completed successfully!\n";

