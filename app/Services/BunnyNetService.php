<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;

class BunnyNetService
{
    protected $apiKey;
    protected $libraryId;
    protected $cdnUrl;
    protected $streamUrl;
    protected $storageZoneName;
    protected $storageAccessKey;
    protected $tokenAuthEnabled;
    protected $tokenAuthKey;

    public function __construct()
    {
        $this->apiKey = config('services.bunny.api_key');
        $this->libraryId = config('services.bunny.library_id');
        $this->cdnUrl = config('services.bunny.cdn_url');
        $this->streamUrl = config('services.bunny.stream_url');
        $this->storageZoneName = config('services.bunny.storage_zone_name');
        $this->storageAccessKey = config('services.bunny.storage_access_key');
        $this->tokenAuthEnabled = config('services.bunny.token_auth_enabled', false);
        $this->tokenAuthKey = config('services.bunny.token_auth_key');
    }

    /**
     * Get the library ID
     * 
     * @return string
     */
    public function getLibraryId(): string
    {
        return $this->libraryId;
    }

    /**
     * Get the CDN URL
     * 
     * @return string
     */
    public function getCdnUrl(): string
    {
        return $this->cdnUrl;
    }

    /**
     * Upload a video file to Bunny.net
     * 
     * @param UploadedFile $file The video file to upload
     * @param string|null $title Optional title for the video
     * @return array ['success' => bool, 'video_id' => string|null, 'video_url' => string|null, 'message' => string]
     */
    public function uploadVideo(UploadedFile $file, ?string $title = null): array
    {
        try {
            // Create video in Bunny.net library
            $createResponse = $this->createVideo($title ?: $file->getClientOriginalName());
            
            if (!$createResponse['success']) {
                return $createResponse;
            }

            $videoId = $createResponse['video_id'];

            // Upload the video file using PUT request to the upload URL
            // Bunny.net uses a specific upload endpoint format
            $uploadUrl = "https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}";
            
            $fileContent = file_get_contents($file->getRealPath());
            $fileSize = filesize($file->getRealPath());

            // Bunny.net requires the file to be uploaded as raw binary data
            $uploadResponse = Http::timeout(3600) // 1 hour timeout for large files
                ->withHeaders([
                    'AccessKey' => $this->apiKey,
                ])
                ->withBody($fileContent, 'application/octet-stream')
                ->put($uploadUrl);

            if (!$uploadResponse->successful()) {
                Log::error('Bunny.net upload failed', [
                    'video_id' => $videoId,
                    'status' => $uploadResponse->status(),
                    'response' => $uploadResponse->body(),
                ]);

                // Try to delete the created video
                $this->deleteVideo($videoId);

                return [
                    'success' => false,
                    'video_id' => null,
                    'video_url' => null,
                    'message' => 'Failed to upload video to Bunny.net: ' . $uploadResponse->body(),
                ];
            }

            // Wait a bit for processing, then get video details
            sleep(2);
            $videoDetails = $this->getVideo($videoId);

            return [
                'success' => true,
                'video_id' => $videoId,
                'video_url' => $this->getVideoUrl($videoId),
                'embed_url' => $this->getEmbedUrl($videoId),
                'thumbnail_url' => $videoDetails['thumbnail_url'] ?? null,
                'duration' => $videoDetails['duration'] ?? null,
                'file_size' => $videoDetails['file_size'] ?? $fileSize,
                'message' => 'Video uploaded successfully to Bunny.net',
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net upload exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'video_id' => null,
                'video_url' => null,
                'message' => 'Exception during Bunny.net upload: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Create a video in Bunny.net library
     * 
     * @param string $title Video title
     * @return array
     */
    public function createVideo(string $title): array
    {
        try {
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("https://video.bunnycdn.com/library/{$this->libraryId}/videos", [
                'title' => $title,
            ]);

            if (!$response->successful()) {
                Log::error('Bunny.net create video failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'video_id' => null,
                    'upload_url' => null,
                    'message' => 'Failed to create video in Bunny.net: ' . $response->body(),
                ];
            }

            $data = $response->json();
            $videoId = $data['guid'] ?? $data['videoId'] ?? null;

            return [
                'success' => true,
                'video_id' => $videoId,
                'upload_url' => $videoId 
                    ? "https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}" 
                    : null,
                'message' => 'Video created successfully in Bunny.net',
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net create video exception', [
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'video_id' => null,
                'upload_url' => null,
                'message' => 'Exception during video creation: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get video details from Bunny.net
     * 
     * @param string $videoId Bunny.net video ID
     * @return array
     */
    public function getVideo(string $videoId): array
    {
        // Check if credentials are configured
        if (empty($this->apiKey)) {
            Log::error('Bunny.net API key is not configured');
            return [
                'success' => false,
                'data' => null,
                'error' => 'BUNNY_API_KEY is not set in .env file',
            ];
        }

        if (empty($this->libraryId)) {
            Log::error('Bunny.net Library ID is not configured');
            return [
                'success' => false,
                'data' => null,
                'error' => 'BUNNY_LIBRARY_ID is not set in .env file',
            ];
        }

        try {
            $url = "https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}";
            
            Log::info('Fetching Bunny.net video', [
                'url' => $url,
                'video_id' => $videoId,
                'library_id' => $this->libraryId,
            ]);

            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
            ])->get($url);

            if (!$response->successful()) {
                $errorBody = $response->body();
                $statusCode = $response->status();
                
                Log::error('Bunny.net API request failed', [
                    'status' => $statusCode,
                    'response' => $errorBody,
                    'video_id' => $videoId,
                    'library_id' => $this->libraryId,
                ]);

                return [
                    'success' => false,
                    'data' => null,
                    'error' => "Bunny.net API returned status {$statusCode}: {$errorBody}",
                    'status_code' => $statusCode,
                ];
            }

            $data = $response->json();
            
            // Log all available fields for debugging (especially for 2024 API format)
            Log::info('Bunny.net video fetched successfully', [
                'video_id' => $videoId,
                'duration' => $data['length'] ?? $data['duration'] ?? null,
                'available_fields' => array_keys($data),
                'pull_zone_fields' => [
                    'pullZoneUrl' => $data['pullZoneUrl'] ?? 'NOT_FOUND',
                    'pull_zone_url' => $data['pull_zone_url'] ?? 'NOT_FOUND',
                    'cdnHostname' => $data['cdnHostname'] ?? 'NOT_FOUND',
                    'cdn_hostname' => $data['cdn_hostname'] ?? 'NOT_FOUND',
                    'videoLibraryId' => $data['videoLibraryId'] ?? 'NOT_FOUND',
                    'guid' => $data['guid'] ?? 'NOT_FOUND',
                ],
            ]);
            
            // Extract captions/transcriptions if available
            // Bunny.net API returns captions in a 'captions' array with fields: srclang, label, url
            $captions = [];
            if (isset($data['captions']) && is_array($data['captions'])) {
                foreach ($data['captions'] as $caption) {
                    $captionUrl = $caption['url'] ?? $caption['src'] ?? null;
                    $language = $caption['srclang'] ?? $caption['language'] ?? 'en';
                    $label = $caption['label'] ?? $caption['language'] ?? $language;
                    
                    // Try to fetch transcription text if URL is available
                    $transcriptionText = null;
                    if ($captionUrl) {
                        try {
                            // Fetch VTT or SRT file content
                            $captionResponse = Http::timeout(10)->get($captionUrl);
                            if ($captionResponse->successful()) {
                                $transcriptionText = $captionResponse->body();
                            }
                        } catch (\Exception $e) {
                            Log::debug('Failed to fetch caption content', [
                                'url' => $captionUrl,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                    
                    $captions[] = [
                        'label' => $label,
                        'language' => $language,
                        'srclang' => $language,
                        'url' => $captionUrl,
                        'default' => $caption['default'] ?? false,
                        'text' => $transcriptionText, // Full transcription text (VTT/SRT format)
                    ];
                }
            }

            // Also check for transcriptions in other possible fields
            if (isset($data['transcriptions']) && is_array($data['transcriptions'])) {
                foreach ($data['transcriptions'] as $transcription) {
                    $captions[] = [
                        'label' => $transcription['label'] ?? $transcription['language'] ?? 'Unknown',
                        'language' => $transcription['language'] ?? 'en',
                        'url' => $transcription['src'] ?? $transcription['url'] ?? null,
                        'default' => $transcription['default'] ?? false,
                        'text' => $transcription['text'] ?? null, // Full transcription text if available
                    ];
                }
            }

            return [
                'success' => true,
                'data' => $data,
                'duration' => $data['length'] ?? $data['duration'] ?? null,
                'file_size' => $data['storageSize'] ?? $data['size'] ?? null,
                'thumbnail_url' => isset($data['thumbnailFileName']) && $data['thumbnailFileName']
                    ? "https://{$this->cdnUrl}/{$videoId}/{$data['thumbnailFileName']}"
                    : null,
                'captions' => $captions,
                'transcription' => !empty($captions) ? $captions : null,
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net get video exception', [
                'video_id' => $videoId,
                'library_id' => $this->libraryId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete a video from Bunny.net
     * 
     * @param string $videoId Bunny.net video ID
     * @return bool
     */
    public function deleteVideo(string $videoId): bool
    {
        try {
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
            ])->delete("https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}");

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('Bunny.net delete video exception', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get video duration from video manifest/playlist (public endpoint, no API key needed)
     * 
     * @param string $videoId Bunny.net video ID
     * @return array ['success' => bool, 'duration' => int|null, 'error' => string|null]
     */
    public function getVideoDurationFromManifest(string $videoId): array
    {
        try {
            // Try to fetch video manifest/playlist which might contain duration
            // Bunny.net CDN URLs format: https://{cdnUrl}/{videoId}/play_720p.mp4
            // Or try to get from embed page metadata
            
            // Method 1: Try to fetch the video file headers to get duration
            // This might work for some video formats
            $videoUrl = "https://{$this->cdnUrl}/{$videoId}/play_720p.mp4";
            
            $ch = curl_init($videoUrl);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $headers = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                // Try to extract duration from Content-Length or other headers
                // Note: This won't give us duration directly, but we can try other methods
                Log::info('Video file accessible, but duration not in headers', [
                    'video_id' => $videoId,
                    'url' => $videoUrl,
                ]);
            }
            
            // Method 2: Try to fetch embed page and look for metadata
            // This is a fallback if API doesn't work
            return [
                'success' => false,
                'duration' => null,
                'error' => 'Duration extraction from manifest not implemented. Please use API key or provide duration manually.',
            ];
            
        } catch (\Exception $e) {
            Log::error('Error fetching video duration from manifest', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);
            
            return [
                'success' => false,
                'duration' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get the streaming URL for a video
     * 
     * @param string $videoId Bunny.net video ID
     * @return string
     */
    public function getVideoUrl(string $videoId): string
    {
        return "https://{$this->streamUrl}/{$videoId}/play_720p.mp4";
    }

    /**
     * Get the embed URL for Bunny.net player
     * 
     * @param string $videoId Bunny.net video ID
     * @return string
     */
    public function getEmbedUrl(string $videoId): string
    {
        return "https://iframe.mediadelivery.net/embed/{$this->libraryId}/{$videoId}";
    }

    /**
     * Get the HLS streaming URL
     * 
     * @param string $videoId Bunny.net video ID
     * @return string
     */
    public function getHlsUrl(string $videoId): string
    {
        return "https://{$this->streamUrl}/{$videoId}/playlist.m3u8";
    }

    /**
     * Get the DASH streaming URL
     * 
     * @param string $videoId Bunny.net video ID
     * @return string
     */
    public function getDashUrl(string $videoId): string
    {
        return "https://{$this->streamUrl}/{$videoId}/play_720p.mpd";
    }

    /**
     * Get available resolutions for a video from Bunny.net Storage
     * 
     * @param string $videoId Bunny.net video ID (GUID)
     * @return array List of available resolutions (e.g., ['240', '360', '480', '720', '1080']) or ['original'] if only original exists
     */
    public function getAvailableResolutions(string $videoId): array
    {
        // Check if required configuration is available
        if (empty($this->storageZoneName) && empty($this->cdnUrl)) {
            Log::warning('Cannot check available resolutions: storage zone name not configured');
            return ['original']; // Fallback to original
        }

        // Get storage zone name
        $storageZoneName = $this->storageZoneName;
        
        // Extract from CDN URL if not set
        if (empty($storageZoneName) && !empty($this->cdnUrl)) {
            $cdnHost = str_replace(['https://', 'http://'], '', $this->cdnUrl);
            $cdnHost = rtrim($cdnHost, '/');
            if (strpos($cdnHost, '.b-cdn.net') !== false) {
                $storageZoneName = str_replace('.b-cdn.net', '', $cdnHost);
            }
        }

        if (empty($storageZoneName) || empty($this->storageAccessKey)) {
            Log::warning('Cannot check available resolutions: storage zone or access key not configured');
            return ['original']; // Fallback to original
        }

        try {
            // List files in the video directory using Storage API
            $listUrl = "https://storage.bunnycdn.com/{$storageZoneName}/{$videoId}/";
            $listUrl .= "?accessKey=" . urlencode($this->storageAccessKey);

            $response = Http::timeout(10)->get($listUrl);

            if (!$response->successful()) {
                Log::warning('Failed to list storage files, falling back to original', [
                    'status' => $response->status(),
                    'video_id' => $videoId
                ]);
                return ['original'];
            }

            $files = $response->json();
            
            if (!is_array($files)) {
                Log::warning('Invalid response from storage API, falling back to original');
                return ['original'];
            }

            $availableResolutions = [];
            $hasOriginal = false;

            // Check for encoded versions and original file
            foreach ($files as $file) {
                $objectName = $file['ObjectName'] ?? $file['objectName'] ?? '';
                
                // Check for encoded versions (play_240p.mp4, play_360p.mp4, etc.)
                if (preg_match('/play_(\d+)p\.mp4/i', $objectName, $matches)) {
                    $resolution = $matches[1];
                    $availableResolutions[] = $resolution;
                }
                
                // Check for original file
                if ($objectName === 'original' || $objectName === 'original.mp4') {
                    $hasOriginal = true;
                }
            }

            // Sort resolutions from highest to lowest
            rsort($availableResolutions, SORT_NUMERIC);

            // Always include original if it exists, or if no encoded versions found
            if ($hasOriginal || empty($availableResolutions)) {
                $availableResolutions[] = 'original';
            }

            Log::info('Detected available resolutions', [
                'video_id' => $videoId,
                'resolutions' => $availableResolutions
            ]);

            return $availableResolutions;

        } catch (\Exception $e) {
            Log::warning('Error checking available resolutions, falling back to original', [
                'video_id' => $videoId,
                'error' => $e->getMessage()
            ]);
            return ['original'];
        }
    }

    /**
     * Get the best available resolution for download
     * 
     * @param string $videoId Bunny.net video ID (GUID)
     * @param string $preferredQuality Preferred quality (720, 1080, etc.) - defaults to 720
     * @return string Best available resolution or 'original' as fallback
     */
    public function getBestAvailableResolution(string $videoId, string $preferredQuality = '720'): string
    {
        $availableResolutions = $this->getAvailableResolutions($videoId);

        if (empty($availableResolutions)) {
            return 'original';
        }

        // If preferred quality is available, use it
        if (in_array($preferredQuality, $availableResolutions)) {
            return $preferredQuality;
        }

        // If preferred is 'original' and it's available, use it
        if ($preferredQuality === 'original' && in_array('original', $availableResolutions)) {
            return 'original';
        }

        // Find the closest available resolution to preferred
        $preferredNum = is_numeric($preferredQuality) ? (int)$preferredQuality : 0;
        $bestResolution = 'original';
        $bestDiff = PHP_INT_MAX;

        foreach ($availableResolutions as $resolution) {
            if ($resolution === 'original') {
                continue; // Skip original for now, we'll use it as last resort
            }

            $resolutionNum = (int)$resolution;
            $diff = abs($resolutionNum - $preferredNum);

            // Prefer resolutions equal to or higher than preferred
            if ($resolutionNum >= $preferredNum && $diff < $bestDiff) {
                $bestResolution = $resolution;
                $bestDiff = $diff;
            }
        }

        // If no resolution found that's >= preferred, use the highest available
        if ($bestResolution === 'original' && count($availableResolutions) > 0) {
            // Get highest numeric resolution
            $numericResolutions = array_filter($availableResolutions, function($r) {
                return $r !== 'original' && is_numeric($r);
            });
            
            if (!empty($numericResolutions)) {
                $bestResolution = max($numericResolutions);
            } else {
                $bestResolution = 'original';
            }
        }

        Log::info('Selected best available resolution', [
            'video_id' => $videoId,
            'preferred' => $preferredQuality,
            'available' => $availableResolutions,
            'selected' => $bestResolution
        ]);

        return $bestResolution;
    }

    /**
     * Get the direct MP4 download URL for a video using Bunny.net Storage API
     * 
     * Automatically detects available resolutions and selects the best one based on preferred quality
     * Format: https://storage.bunnycdn.com/{storage_zone_name}/{video_id}/{file_path}?accessKey={access_key}&download
     * 
     * @param string $videoId Bunny.net video ID (GUID)
     * @param string $quality Preferred quality (720, 1080, etc.) - defaults to 720. Will use best available if preferred not found.
     * @param int $expirationMinutes Token expiration time in minutes (default: 60) - not used for Storage API
     * @return string|null
     */
    public function getDownloadUrl(string $videoId, string $quality = '720', int $expirationMinutes = 60): ?string
    {
        // Check if required configuration is available
        if (empty($this->libraryId)) {
            Log::error('Bunny.net Library ID is not configured for download URL');
            return null;
        }

        // Get storage zone name
        $storageZoneName = $this->storageZoneName;
        
        // If storage zone name is not explicitly set, try to extract it from CDN URL
        if (empty($storageZoneName) && !empty($this->cdnUrl)) {
            // CDN URL format: vz-0cc8af54-835.b-cdn.net
            // Storage zone name: vz-0cc8af54-835
            $cdnHost = str_replace(['https://', 'http://'], '', $this->cdnUrl);
            $cdnHost = rtrim($cdnHost, '/');
            
            // Extract storage zone name (everything before .b-cdn.net)
            if (strpos($cdnHost, '.b-cdn.net') !== false) {
                $storageZoneName = str_replace('.b-cdn.net', '', $cdnHost);
                Log::info('Extracted storage zone name from CDN URL', [
                    'cdn_url' => $this->cdnUrl,
                    'extracted_storage_zone' => $storageZoneName
                ]);
            }
        }
        
        // If still no storage zone name, try to get it from API
        if (empty($storageZoneName)) {
            try {
                $videoData = $this->getVideo($videoId);
                if ($videoData['success'] && isset($videoData['data'])) {
                    $videoInfo = $videoData['data'];
                    
                    // Check for storage zone name in API response
                    $storageZoneName = $videoInfo['storageZoneName'] 
                        ?? $videoInfo['storage_zone_name']
                        ?? $videoInfo['cdnHostname'] 
                        ?? $videoInfo['cdn_hostname']
                        ?? null;
                    
                    if ($storageZoneName) {
                        // Remove .b-cdn.net if present
                        $storageZoneName = str_replace('.b-cdn.net', '', $storageZoneName);
                        // Remove protocol if present
                        $storageZoneName = str_replace(['https://', 'http://'], '', $storageZoneName);
                        Log::info('Got storage zone name from API', ['storage_zone' => $storageZoneName]);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Could not fetch video data from API', [
                    'error' => $e->getMessage(),
                    'video_id' => $videoId
                ]);
            }
        }
        
        // Check if we have storage zone name
        if (empty($storageZoneName)) {
            Log::error('Bunny.net Storage Zone Name is not configured', [
                'video_id' => $videoId,
                'cdn_url' => $this->cdnUrl,
                'storage_zone_name' => $this->storageZoneName,
                'note' => 'Please set BUNNY_STORAGE_ZONE_NAME in .env or ensure BUNNY_CDN_URL is set correctly (e.g., vz-0cc8af54-835.b-cdn.net)'
            ]);
            return null;
        }
        
        // Check if we have storage access key
        if (empty($this->storageAccessKey)) {
            Log::error('Bunny.net Storage Access Key is not configured', [
                'video_id' => $videoId,
                'note' => 'Please set BUNNY_STORAGE_ACCESS_KEY in .env. You can find this in Bunny.net Dashboard → Storage → Your Storage Zone → FTP & HTTP API → Access Key'
            ]);
            return null;
        }
        
        // Detect best available resolution
        $bestResolution = $this->getBestAvailableResolution($videoId, $quality);
        
        // Build file path based on selected resolution
        if ($bestResolution === 'original') {
            $filePath = 'original.mp4';
        } else {
            $filePath = "play_{$bestResolution}p.mp4";
        }
        
        // Build Storage API download URL
        // Format: https://storage.bunnycdn.com/{storage_zone_name}/{video_id}/{file_path}?accessKey={access_key}&download
        $downloadUrl = "https://storage.bunnycdn.com/{$storageZoneName}/{$videoId}/{$filePath}";
        $downloadUrl .= "?accessKey=" . urlencode($this->storageAccessKey);
        $downloadUrl .= "&download";
        
        Log::info('Generated Storage API download URL', [
            'storage_zone_name' => $storageZoneName,
            'video_id' => $videoId,
            'preferred_quality' => $quality,
            'selected_resolution' => $bestResolution,
            'file_path' => $filePath,
            'download_url' => $downloadUrl,
            'has_access_key' => !empty($this->storageAccessKey),
            'access_key_length' => strlen($this->storageAccessKey),
            'access_key_preview' => substr($this->storageAccessKey, 0, 8) . '...' . substr($this->storageAccessKey, -8),
            'note' => 'Automatically selected best available resolution. If download fails, verify: 1) Key is HTTP API Access Key (not FTP Password), 2) Storage zone name is correct, 3) File exists in storage'
        ]);
        
        return $downloadUrl;
    }

    /**
     * Get download URL for transcription services (tries multiple resolutions)
     * Unlike getDownloadUrl which gets the best quality, this tries to find ANY working video file
     * 
     * @param string $videoId Bunny.net video ID
     * @return string|null Direct URL to video file or null if not found
     */
    public function getTranscriptionUrl(string $videoId): ?string
    {
        // Check if required configuration is available
        if (empty($this->libraryId)) {
            Log::error('Bunny.net Library ID is not configured');
            return null;
        }

        $storageZoneName = $this->storageZoneName;
        
        // Extract storage zone from CDN URL if needed
        if (empty($storageZoneName) && !empty($this->cdnUrl)) {
            $cdnHost = str_replace(['https://', 'http://'], '', $this->cdnUrl);
            $cdnHost = rtrim($cdnHost, '/');
            if (strpos($cdnHost, '.b-cdn.net') !== false) {
                $storageZoneName = str_replace('.b-cdn.net', '', $cdnHost);
            }
        }
        
        if (empty($storageZoneName)) {
            Log::error('Storage Zone Name not configured', ['video_id' => $videoId]);
            return null;
        }
        
        if (empty($this->storageAccessKey)) {
            Log::error('Storage Access Key not configured', ['video_id' => $videoId]);
            return null;
        }

        // Try multiple file paths in order of preference
        // Note: Bunny.net creates different files depending on video encoding settings
        $filePaths = [
            'play_720p.mp4',      // Most common
            'play_1080p.mp4',     // High quality
            'play_480p.mp4',      // Medium quality
            'play_360p.mp4',      // Lower quality (common for short videos)
            'play_240p.mp4',      // Lowest quality (often available)
            'original',           // Original file (no extension - Bunny.net format)
            'original.mp4',       // Original with extension (fallback)
        ];

        Log::info('Attempting to find accessible video file for transcription', [
            'video_id' => $videoId,
            'storage_zone' => $storageZoneName,
            'attempting_paths' => $filePaths,
        ]);

        foreach ($filePaths as $filePath) {
            $url = "https://storage.bunnycdn.com/{$storageZoneName}/{$videoId}/{$filePath}";
            $url .= "?accessKey=" . urlencode($this->storageAccessKey);
            
            // Test if URL is accessible
            try {
                Log::debug('Testing video file URL', [
                    'file_path' => $filePath,
                    'url_preview' => substr($url, 0, 120) . '...',
                ]);
                
                $response = Http::timeout(10)->head($url);
                
                Log::debug('HEAD request result', [
                    'file_path' => $filePath,
                    'status' => $response->status(),
                    'successful' => $response->successful(),
                    'content_type' => $response->header('Content-Type'),
                ]);
                
                if ($response->successful()) {
                    Log::info('✓ Found accessible video file for transcription', [
                        'video_id' => $videoId,
                        'file_path' => $filePath,
                        'status' => $response->status(),
                        'content_type' => $response->header('Content-Type'),
                        'url_preview' => substr($url, 0, 100) . '...',
                    ]);
                    
                    return $url;
                }
                
            } catch (\Exception $e) {
                Log::debug('Error checking file', [
                    'file_path' => $filePath,
                    'error' => $e->getMessage(),
                    'exception_type' => get_class($e),
                ]);
            }
        }

        Log::error('No accessible video file found for transcription', [
            'video_id' => $videoId,
            'tried_paths' => $filePaths,
            'note' => 'Video might still be processing in Bunny.net or MP4 Fallback is not enabled',
        ]);

        return null;
    }

    /**
     * Get a signed HLS URL for transcription services
     * This generates a URL that bypasses Bunny.net security for temporary access
     * 
     * @param string $videoId Bunny.net video ID
     * @param int $expirationMinutes How many minutes the URL should be valid (default: 60)
     * @return string|null Signed URL or null if can't be generated
     */
    public function getSignedTranscriptionUrl(string $videoId, int $expirationMinutes = 60): ?string
    {
        // Check if we have storage zone name and access key
        if (empty($this->storageZoneName)) {
            Log::error('Storage Zone Name is not configured');
            return null;
        }
        
        if (empty($this->storageAccessKey)) {
            Log::error('Storage Access Key is not configured');
            return null;
        }
        
        // Try multiple file paths in order of preference
        // Based on actual Bunny.net storage structure
        $filePaths = [
            'play_240p.mp4',      // Lowest quality (most likely to exist)
            'play_360p.mp4',      // Medium quality
            'original',           // Original file (no extension)
        ];
        
        Log::info('Attempting to generate transcription URL', [
            'video_id' => $videoId,
            'storage_zone' => $this->storageZoneName,
            'trying_files' => $filePaths,
        ]);
        
        // Try each file path
        // Note: We don't test with HEAD requests because Bunny.net returns 401 for HEAD
        // but 200 for GET. Deepgram uses GET requests, so the URLs will work fine.
        foreach ($filePaths as $filePath) {
            // Build direct Storage API URL with access key
            // Format: https://storage.bunnycdn.com/{zone}/{videoId}/{file}?accessKey={key}
            $url = "https://storage.bunnycdn.com/{$this->storageZoneName}/{$videoId}/{$filePath}";
            $url .= "?accessKey=" . urlencode($this->storageAccessKey);
            
            Log::info('Generated transcription URL (prioritizing low resolutions)', [
                'video_id' => $videoId,
                'file_path' => $filePath,
                'url_preview' => substr($url, 0, 100) . '...',
                'note' => 'Using Storage API with access key - HEAD requests return 401 but GET requests work',
            ]);
            
            // Return the first URL (play_240p.mp4 - most likely to exist)
            // Deepgram will validate with GET request when transcribing
            return $url;
        }
        
        // If Storage API fails, try CDN URL as fallback
        $cdnHost = $this->cdnUrl;
        if (!empty($cdnHost)) {
            $cdnHost = str_replace(['https://', 'http://'], '', $cdnHost);
            $cdnHost = rtrim($cdnHost, '/');
            
            // Try HLS playlist (Deepgram supports HLS)
            $hlsUrl = "https://{$cdnHost}/{$videoId}/playlist.m3u8";
            
            Log::info('Trying CDN HLS URL as fallback', [
                'video_id' => $videoId,
                'url' => $hlsUrl,
            ]);
            
            return $hlsUrl;
        }
        
        Log::error('❌ No accessible video file found for transcription', [
            'video_id' => $videoId,
            'tried_storage_files' => $filePaths,
            'tried_cdn' => !empty($cdnHost),
            'note' => 'Storage Access Key might lack file read permissions. Check Bunny.net Dashboard → Storage → FTP & HTTP API → Permissions',
        ]);
        
        return null;
    }

    /**
     * Generate a token for Bunny.net CDN token authentication
     * 
     * @param string $url The URL to protect
     * @param int $expiration Unix timestamp when token expires
     * @param string $tokenKey The token authentication key from Bunny.net
     * @return string
     */
    protected function generateToken(string $url, int $expiration, string $tokenKey): string
    {
        // Extract path from URL (Bunny.net token auth uses path only, no query string)
        $parsedUrl = parse_url($url);
        $path = $parsedUrl['path'] ?? '';
        
        // Bunny.net Stream token format: expiration_timestamp + path
        // Then HMAC SHA256 with token key
        $tokenString = $expiration . $path;
        
        Log::info('Generating Bunny.net token', [
            'url' => $url,
            'path' => $path,
            'expiration' => $expiration,
            'expiration_date' => date('Y-m-d H:i:s', $expiration),
            'token_string' => $tokenString,
            'token_key_length' => strlen($tokenKey),
            'token_key_preview' => substr($tokenKey, 0, 10) . '...' . substr($tokenKey, -10)
        ]);
        
        // Generate HMAC SHA256 hash
        $hash = hash_hmac('sha256', $tokenString, $tokenKey, true);
        
        if ($hash === false) {
            Log::error('HMAC hash generation failed');
            throw new \Exception('Failed to generate HMAC hash for token');
        }
        
        // Base64 encode and make URL-safe
        $token = base64_encode($hash);
        $token = str_replace(['+', '/', '='], ['-', '_', ''], $token);
        
        // Bunny.net format: expiration_timestamp_token
        $finalToken = $expiration . '_' . $token;
        
        Log::info('Token generated successfully', [
            'token_length' => strlen($finalToken),
            'token_preview' => substr($finalToken, 0, 30) . '...',
            'expiration' => $expiration,
            'expiration_date' => date('Y-m-d H:i:s', $expiration)
        ]);
        
        return $finalToken;
    }

    /**
     * Get available audio tracks for a video
     * Note: This requires checking the video metadata from Bunny.net API
     * 
     * @param string $videoId Bunny.net video ID
     * @return array Array of available audio tracks with language info
     */
    public function getAudioTracks(string $videoId): array
    {
        $videoData = $this->getVideo($videoId);
        
        if (!$videoData['success'] || !isset($videoData['data'])) {
            return [];
        }

        $data = $videoData['data'];
        $audioTracks = [];

        // Check if video has multiple audio tracks
        // Bunny.net stores this in the video metadata
        if (isset($data['audioTracks']) && is_array($data['audioTracks'])) {
            foreach ($data['audioTracks'] as $track) {
                $audioTracks[] = [
                    'language' => $track['language'] ?? 'en',
                    'label' => $track['label'] ?? 'Default',
                    'default' => $track['default'] ?? false,
                ];
            }
        }

        // If no audio tracks found, return default
        if (empty($audioTracks)) {
            $audioTracks[] = [
                'language' => 'en',
                'label' => 'Default',
                'default' => true,
            ];
        }

        return $audioTracks;
    }

    /**
     * Update video metadata in Bunny.net
     * 
     * @param string $videoId Bunny.net video ID
     * @param array $data Metadata to update
     * @return bool
     */
    public function updateVideo(string $videoId, array $data): bool
    {
        try {
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}", $data);

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('Bunny.net update video exception', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Enable automatic transcription generation for a video
     * This will generate captions/transcriptions automatically using Bunny.net's AI
     * 
     * @param string $videoId Bunny.net video ID
     * @return array ['success' => bool, 'message' => string]
     */
    public function enableTranscription(string $videoId): array
    {
        try {
            // Request transcription generation
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}", [
                'transcription' => true,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Transcription generation requested. It may take a few minutes to process.',
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to enable transcription: ' . $response->body(),
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net enable transcription exception', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception during transcription request: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Delete a specific caption track from a video
     * 
     * @param string $videoId Bunny.net video ID
     * @param string $language Language code (srclang) to delete
     * @return array ['success' => bool, 'message' => string]
     */
    public function deleteCaption(string $videoId, string $language): array
    {
        try {
            Log::info('Deleting caption from Bunny.net', [
                'video_id' => $videoId,
                'language' => $language,
            ]);
            
            // DELETE https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/captions/{srclang}
            $url = "https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}/captions/{$language}";
            
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
            ])->delete($url);

            if ($response->successful() || $response->status() === 404) {
                // 404 is OK - means caption doesn't exist
                return [
                    'success' => true,
                    'message' => "Caption deleted for language: {$language}",
                ];
            }

            return [
                'success' => false,
                'message' => "Failed to delete caption: " . $response->body(),
                'status' => $response->status(),
            ];

        } catch (\Exception $e) {
            Log::error('Delete caption exception', [
                'video_id' => $videoId,
                'language' => $language,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Delete all captions from a video
     * 
     * @param string $videoId Bunny.net video ID
     * @return array ['success' => bool, 'message' => string]
     */
    public function deleteAllCaptions(string $videoId): array
    {
        try {
            // Common language codes that might exist
            $possibleLanguages = ['en', 'es', 'pt', 'fr', 'de', 'it', 'en-US', 'es-ES', 'pt-BR', 'English', 'Spanish', 'Portuguese'];
            
            $deletedCount = 0;
            foreach ($possibleLanguages as $lang) {
                $result = $this->deleteCaption($videoId, $lang);
                if ($result['success']) {
                    $deletedCount++;
                }
            }

            Log::info('Deleted all captions from Bunny.net', [
                'video_id' => $videoId,
                'deleted_count' => $deletedCount,
            ]);

            return [
                'success' => true,
                'message' => "Deleted {$deletedCount} caption tracks",
                'deleted_count' => $deletedCount,
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Upload captions/subtitles to a video
     * 
     * @param string $videoId Bunny.net video ID
     * @param string $captionContent VTT or SRT file content
     * @param string $language Language code (e.g., 'en', 'es', 'pt')
     * @param string $label Label for the caption track (e.g., 'EN', 'ES', 'PT')
     * @param bool $deleteExisting Whether to delete existing caption for this language first
     * @return array ['success' => bool, 'message' => string]
     */
    public function uploadCaptions(string $videoId, string $captionContent, string $language = 'en', string $label = 'EN', bool $deleteExisting = true): array
    {
        try {
            // Delete existing caption for this language first to avoid duplicates
            if ($deleteExisting) {
                $this->deleteCaption($videoId, $language);
            }

            Log::info('Uploading captions to Bunny.net', [
                'video_id' => $videoId,
                'language' => $language,
                'label' => $label,
                'content_length' => strlen($captionContent),
                'deleted_existing' => $deleteExisting,
            ]);
            
            // Bunny.net Captions API endpoint
            // POST https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/captions/{srclang}
            $url = "https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}/captions/{$language}";
            
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($url, [
                'srclang' => $language,
                'label' => $label,
                'captionsFile' => base64_encode($captionContent),
            ]);

            Log::info('Bunny.net caption upload response', [
                'video_id' => $videoId,
                'language' => $language,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => "Captions uploaded successfully for language: {$language}",
                    'language' => $language,
                ];
            }

            Log::error('Bunny.net caption upload failed', [
                'video_id' => $videoId,
                'language' => $language,
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to upload captions: ' . $response->body(),
                'status' => $response->status(),
                'language' => $language,
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net upload captions exception', [
                'video_id' => $videoId,
                'language' => $language,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception during caption upload: ' . $e->getMessage(),
                'language' => $language,
            ];
        }
    }

    /**
     * Upload audio track as a separate video (Bunny.net doesn't support multiple audio tracks in one video)
     * Alternative: Create a video with only audio track, then link it to main video
     * 
     * @param string $audioFilePath Path to audio file
     * @param string $title Title for the audio track video
     * @param string $language Language code (e.g., 'en', 'es', 'pt')
     * @return array ['success' => bool, 'video_id' => string|null, 'message' => string]
     */
    public function uploadAudioTrack(string $audioFilePath, string $title, string $language = 'en'): array
    {
        try {
            // Create a video entry for the audio track
            $createResponse = $this->createVideo($title);
            
            if (!$createResponse['success']) {
                return $createResponse;
            }

            $audioVideoId = $createResponse['video_id'];

            // Upload audio file
            $uploadUrl = "https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$audioVideoId}";
            
            $fileContent = file_get_contents($audioFilePath);
            
            $uploadResponse = Http::timeout(3600)
                ->withHeaders([
                    'AccessKey' => $this->apiKey,
                ])
                ->withBody($fileContent, 'application/octet-stream')
                ->put($uploadUrl);

            if (!$uploadResponse->successful()) {
                Log::error('Bunny.net audio track upload failed', [
                    'audio_video_id' => $audioVideoId,
                    'status' => $uploadResponse->status(),
                    'response' => $uploadResponse->body(),
                ]);

                $this->deleteVideo($audioVideoId);

                return [
                    'success' => false,
                    'video_id' => null,
                    'message' => 'Failed to upload audio track: ' . $uploadResponse->body(),
                ];
            }

            return [
                'success' => true,
                'video_id' => $audioVideoId,
                'language' => $language,
                'message' => 'Audio track uploaded successfully.',
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net upload audio track exception', [
                'audio_file' => $audioFilePath,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'video_id' => null,
                'message' => 'Exception during audio track upload: ' . $e->getMessage(),
            ];
        }
    }
}


