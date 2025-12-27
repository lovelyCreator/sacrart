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

    public function __construct()
    {
        $this->apiKey = config('services.bunny.api_key');
        $this->libraryId = config('services.bunny.library_id');
        $this->cdnUrl = config('services.bunny.cdn_url');
        $this->streamUrl = config('services.bunny.stream_url');
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
            
            Log::info('Bunny.net video fetched successfully', [
                'video_id' => $videoId,
                'duration' => $data['length'] ?? $data['duration'] ?? null,
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
     * Get the direct MP4 download URL for a video
     * Requires MP4 Fallback to be enabled in Bunny.net settings
     * 
     * @param string $videoId Bunny.net video ID
     * @param string $quality Quality (720, 1080, etc.) - defaults to 720
     * @return string|null
     */
    public function getDownloadUrl(string $videoId, string $quality = '720'): ?string
    {
        if (empty($this->cdnUrl)) {
            return null;
        }
        
        // Format: https://{cdn_url}/{video_id}/play_{quality}p.mp4
        return "https://{$this->cdnUrl}/{$videoId}/play_{$quality}p.mp4";
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
     * Upload captions/subtitles to a video
     * 
     * @param string $videoId Bunny.net video ID
     * @param string $captionContent VTT or SRT file content
     * @param string $language Language code (e.g., 'en', 'es', 'pt')
     * @param string $label Label for the caption track (e.g., 'English', 'Spanish')
     * @return array ['success' => bool, 'message' => string]
     */
    public function uploadCaptions(string $videoId, string $captionContent, string $language = 'en', string $label = 'English'): array
    {
        try {
            // Bunny.net API endpoint for uploading captions
            // Note: This may require using the video library API endpoint
            // Check Bunny.net documentation for the exact endpoint
            
            // For now, we'll use the update video endpoint with captions data
            // Note: Actual implementation may vary based on Bunny.net API version
            $response = Http::withHeaders([
                'AccessKey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("https://video.bunnycdn.com/library/{$this->libraryId}/videos/{$videoId}/captions", [
                'srclang' => $language,
                'label' => $label,
                'content' => $captionContent,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Captions uploaded successfully.',
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to upload captions: ' . $response->body(),
                'status' => $response->status(),
            ];

        } catch (\Exception $e) {
            Log::error('Bunny.net upload captions exception', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception during caption upload: ' . $e->getMessage(),
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

