<?php
/**
 * Test API endpoint to get HLS URL with audio track information
 * 
 * Usage:
 * GET /test_hls_audio_track_api.php?video_id={videoId}&language={lang}
 * 
 * Example:
 * GET /test_hls_audio_track_api.php?video_id=f70e8def-51c2-4998-84e4-090a30bc3fc6&language=es
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $videoId = $_GET['video_id'] ?? null;
    $language = $_GET['language'] ?? 'en';
    
    if (!$videoId) {
        throw new Exception('video_id parameter is required');
    }

    // Get Bunny.net configuration
    $cdnUrl = config('services.bunny.cdn_url');
    $streamUrl = config('services.bunny.stream_url');
    $libraryId = config('services.bunny.library_id');
    $tokenAuthEnabled = config('services.bunny.token_auth_enabled', false);
    $tokenAuthKey = config('services.bunny.token_auth_key');

    // Build HLS URL
    $hlsUrl = null;
    
    // Try CDN URL first (for Storage videos)
    if (!empty($cdnUrl)) {
        $cdnHost = str_replace(['https://', 'http://'], '', $cdnUrl);
        $cdnHost = rtrim($cdnHost, '/');
        $hlsUrl = "https://{$cdnHost}/{$videoId}/playlist.m3u8";
    }
    // Fallback to Stream URL (for Stream videos)
    else if (!empty($streamUrl)) {
        $streamHost = $streamUrl;
        if (strpos($streamHost, '://') === false) {
            $streamHost = "https://{$streamHost}";
        }
        // Stream API requires library ID in path: /{libraryId}/{videoId}/playlist.m3u8
        if (!empty($libraryId)) {
            $hlsUrl = "{$streamHost}/{$libraryId}/{$videoId}/playlist.m3u8";
        } else {
            $hlsUrl = "{$streamHost}/{$videoId}/playlist.m3u8";
        }
    }

    if (!$hlsUrl) {
        throw new Exception('HLS URL could not be generated. Check Bunny.net configuration.');
    }

    // Add token authentication if enabled
    if ($tokenAuthEnabled && !empty($tokenAuthKey)) {
        $expiration = time() + (60 * 60); // 1 hour
        $token = generateToken($hlsUrl, $expiration, $tokenAuthKey);
        $hlsUrl .= "?token=" . urlencode($token);
    }

    // Get video model to check available audio tracks
    $video = \App\Models\Video::where('bunny_video_id', $videoId)
        ->orWhere('bunny_embed_url', 'like', "%{$videoId}%")
        ->first();

    $response = [
        'success' => true,
        'video_id' => $videoId,
        'language' => $language,
        'hls_url' => $hlsUrl,
        'audio_tracks' => [
            ['id' => 0, 'name' => 'English', 'lang' => 'en', 'groupId' => 'default'],
            ['id' => 1, 'name' => 'Spanish', 'lang' => 'es', 'groupId' => 'default'],
            ['id' => 2, 'name' => 'Portuguese', 'lang' => 'pt', 'groupId' => 'default'],
        ],
        'default_audio_track' => $language,
        'video_info' => $video ? [
            'id' => $video->id,
            'title' => $video->title,
            'duration' => $video->duration,
        ] : null,
        'configuration' => [
            'cdn_url' => $cdnUrl,
            'stream_url' => $streamUrl,
            'library_id' => $libraryId,
            'token_auth_enabled' => $tokenAuthEnabled,
        ],
    ];

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ], JSON_PRETTY_PRINT);
}

/**
 * Generate token for Bunny.net CDN token authentication
 * This matches the method in BunnyNetService::generateToken()
 */
function generateToken($url, $expiration, $key) {
    // Extract path from URL (Bunny.net token auth uses path only, no query string)
    $parsedUrl = parse_url($url);
    $path = $parsedUrl['path'] ?? '';
    
    // Bunny.net Stream token format: expiration_timestamp + path
    // Then HMAC SHA256 with token key
    $tokenString = $expiration . $path;
    
    // Generate HMAC SHA256 hash
    $hash = hash_hmac('sha256', $tokenString, $key, true);
    
    // Base64 encode and make URL-safe
    $encoded = base64_encode($hash);
    $encoded = str_replace(['+', '/', '='], ['-', '_', ''], $encoded);
    
    return $expiration . '_' . $encoded;
}
