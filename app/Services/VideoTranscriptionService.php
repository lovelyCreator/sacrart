<?php

namespace App\Services;

use App\Models\Video;
use App\Models\Reel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Exception;

class VideoTranscriptionService
{
    protected $deepgramService;
    protected $bunnyNetService;
    protected $translateService;

    public function __construct(
        DeepgramService $deepgramService,
        BunnyNetService $bunnyNetService,
        GoogleTranslateService $translateService
    ) {
        $this->deepgramService = $deepgramService;
        $this->bunnyNetService = $bunnyNetService;
        $this->translateService = $translateService;
    }

    /**
     * Process video transcription and upload captions for all languages
     * This is the main method called from admin panel
     * 
     * @param mixed $model Video or Reel model instance
     * @param array $languages Languages to process ['en', 'es', 'pt']
     * @param string $sourceLanguage Source language of the video
     * @return array ['success' => bool, 'message' => string, 'data' => array]
     */
    public function processVideoTranscription($model, array $languages = ['en', 'es', 'pt'], string $sourceLanguage = 'en'): array
    {
        try {
            // Update status to processing using direct DB update to avoid model events
            DB::table($model->getTable())
                ->where('id', $model->id)
                ->update([
                    'transcription_status' => 'processing',
                    'transcription_error' => null,
                    'updated_at' => now(),
                ]);
            
            // Refresh model to sync
            $model->refresh();

            // Get Bunny.net video ID - try direct ID first, then extract from embed URL
            $bunnyVideoId = $model->bunny_video_id;
            
            // If no direct video ID, try to extract from embed URL
            if (!$bunnyVideoId && $model->bunny_embed_url) {
                $embedUrl = $model->bunny_embed_url;
                
                // Format 1: https://iframe.mediadelivery.net/embed/{library}/{video}
                if (preg_match('/\/embed\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
                    $bunnyVideoId = $matches[1];
                }
                // Format 2: https://iframe.mediadelivery.net/play/{library}/{video}
                elseif (preg_match('/\/play\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
                    $bunnyVideoId = $matches[1];
                }
                // Format 3: UUID format in URL
                elseif (preg_match('/([a-f0-9\-]{36})/', $embedUrl, $matches)) {
                    $bunnyVideoId = $matches[1];
                }
                
                // If we extracted the video ID, save it to the model for future use
                if ($bunnyVideoId) {
                    DB::table($model->getTable())
                        ->where('id', $model->id)
                        ->update(['bunny_video_id' => $bunnyVideoId]);
                    $model->refresh();
                }
            }
            
            if (!$bunnyVideoId) {
                throw new Exception('No Bunny.net video ID found. Please ensure the video has either bunny_video_id or bunny_embed_url set.');
            }

            Log::info('Checking for existing transcriptions in Bunny.net', [
                'model_id' => $model->id,
                'bunny_video_id' => $bunnyVideoId,
            ]);

            // Step 1: Check if video already has transcriptions in Bunny.net
            $videoData = $this->bunnyNetService->getVideo($bunnyVideoId);
            
            // Download and save existing transcriptions from Bunny.net
            $transcriptions = [];
            $captionUrls = [];
            $audioUrls = [];
            
            // First, process captions that Bunny.net reports
            if ($videoData['success'] && !empty($videoData['captions'])) {
                Log::info('Found existing captions in Bunny.net', [
                    'model_id' => $model->id,
                    'bunny_video_id' => $bunnyVideoId,
                    'captions_count' => count($videoData['captions']),
                    'captions' => array_map(function($cap) {
                        return [
                            'language' => $cap['language'] ?? $cap['srclang'] ?? 'unknown',
                            'has_url' => !empty($cap['url']),
                            'has_text' => !empty($cap['text']),
                        ];
                    }, $videoData['captions']),
                ]);
                
                foreach ($videoData['captions'] as $caption) {
                    $language = $caption['language'] ?? $caption['srclang'] ?? 'en';
                    $captionUrl = $caption['url'] ?? null;
                    $captionText = $caption['text'] ?? null;
                    
                    // Normalize language code (e.g., 'en-US' -> 'en')
                    $language = strtolower(substr($language, 0, 2));
                    
                    // Only process requested languages
                    if (!in_array($language, $languages)) {
                        continue;
                    }
                    
                    // If we have the text directly, use it
                    if ($captionText) {
                        // Parse VTT content to extract text
                        $text = $this->parseVTTToText($captionText);
                        $transcriptions[$language] = [
                            'text' => $text,
                            'vtt' => $captionText,
                            'processed_at' => now()->toDateTimeString(),
                            'method' => 'bunny_existing',
                            'bunny_caption_url' => $captionUrl,
                        ];
                    } elseif ($captionUrl) {
                        // Fetch caption content from URL
                        try {
                            $captionResponse = \Illuminate\Support\Facades\Http::timeout(30)->get($captionUrl);
                            if ($captionResponse->successful()) {
                                $vttContent = $captionResponse->body();
                                $text = $this->parseVTTToText($vttContent);
                                
                                $transcriptions[$language] = [
                                    'text' => $text,
                                    'vtt' => $vttContent,
                                    'processed_at' => now()->toDateTimeString(),
                                    'method' => 'bunny_existing',
                                    'bunny_caption_url' => $captionUrl,
                                ];
                                
                                Log::info("Downloaded transcription from Bunny.net for language: {$language}", [
                                    'model_id' => $model->id,
                                    'language' => $language,
                                    'text_length' => strlen($text),
                                    'vtt_length' => strlen($vttContent),
                                ]);
                            }
                        } catch (\Exception $e) {
                            Log::warning("Failed to download caption from URL for language: {$language}", [
                                'model_id' => $model->id,
                                'language' => $language,
                                'url' => $captionUrl,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                    
                    if (isset($transcriptions[$language])) {
                        $captionUrls[$language] = $captionUrl;
                        $audioUrls[$language] = 'original'; // Use original video audio
                    }
                }
            }
            
            // Second, try to download missing languages directly from Storage API
            // This ensures we get all requested languages even if Bunny.net doesn't report them
            foreach ($languages as $requestedLanguage) {
                // Skip if we already have this language
                if (isset($transcriptions[$requestedLanguage])) {
                    continue;
                }
                
                Log::info('Attempting to download missing language from Storage API', [
                    'model_id' => $model->id,
                    'bunny_video_id' => $bunnyVideoId,
                    'language' => $requestedLanguage,
                ]);
                
                // Try to download from Storage API using BunnyNetService logic
                $storageZoneName = config('services.bunny.storage_zone_name');
                $storageAccessKey = config('services.bunny.storage_access_key');
                
                // Extract storage zone from CDN URL if not set
                if (empty($storageZoneName)) {
                    $cdnUrl = config('services.bunny.cdn_url');
                    if (!empty($cdnUrl)) {
                        $cdnHost = str_replace(['https://', 'http://'], '', $cdnUrl);
                        $cdnHost = rtrim($cdnHost, '/');
                        if (strpos($cdnHost, '.b-cdn.net') !== false) {
                            $storageZoneName = str_replace('.b-cdn.net', '', $cdnHost);
                        }
                    }
                }
                
                if (!empty($storageZoneName) && !empty($storageAccessKey)) {
                    $langUpper = strtoupper($requestedLanguage);
                    $langLower = strtolower($requestedLanguage);
                    
                    // Try VTT first (most common), then SRT
                    $possibleFileNames = [
                        "{$langUpper}.vtt",
                        "{$langLower}.vtt",
                        "{$langUpper}.srt",
                        "{$langLower}.srt",
                    ];
                    
                    foreach ($possibleFileNames as $fileName) {
                        $storageUrl = "https://storage.bunnycdn.com/{$storageZoneName}/{$bunnyVideoId}/captions/{$fileName}";
                        $storageUrl .= "?accessKey=" . urlencode($storageAccessKey);
                        
                        try {
                            Log::info('Attempting to download caption from Storage API for missing language', [
                                'model_id' => $model->id,
                                'video_id' => $bunnyVideoId,
                                'language' => $requestedLanguage,
                                'file_name' => $fileName,
                                'url' => $storageUrl,
                            ]);
                            
                            $captionResponse = \Illuminate\Support\Facades\Http::timeout(30)->get($storageUrl);
                            
                            if ($captionResponse->successful()) {
                                $captionContent = $captionResponse->body();
                                
                                // Check if we got actual content (not HTML error page or JSON)
                                // Note: We check for specific error patterns, NOT just '404' 
                                // because VTT timestamps can contain '404' (e.g., 00:04:04.000)
                                $isValidContent = !empty($captionContent) && 
                                    !str_contains($captionContent, '<html') && 
                                    !str_contains($captionContent, '<!DOCTYPE') &&
                                    !preg_match('/\b404\s+(Not\s+Found|Error)\b/i', $captionContent) &&
                                    !str_contains($captionContent, 'File Not Found') &&
                                    !str_contains($captionContent, 'ObjectNotFound') &&
                                    !str_starts_with(trim($captionContent), '[') && // Not JSON array
                                    !str_starts_with(trim($captionContent), '{') && // Not JSON object
                                    // Positive check: valid VTT/SRT should contain WEBVTT or timestamps
                                    (str_contains($captionContent, 'WEBVTT') || 
                                     preg_match('/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/', $captionContent));
                                
                                if ($isValidContent) {
                                    
                                    $text = $this->parseVTTToText($captionContent);
                                    
                                    $transcriptions[$requestedLanguage] = [
                                        'text' => $text,
                                        'vtt' => $captionContent,
                                        'processed_at' => now()->toDateTimeString(),
                                        'method' => 'bunny_storage_direct',
                                        'bunny_caption_url' => $storageUrl,
                                    ];
                                    
                                    $captionUrls[$requestedLanguage] = $storageUrl;
                                    $audioUrls[$requestedLanguage] = 'original';
                                    
                                    Log::info('Successfully downloaded missing language from Storage API', [
                                        'model_id' => $model->id,
                                        'language' => $requestedLanguage,
                                        'file_name' => $fileName,
                                        'text_length' => strlen($text),
                                        'vtt_length' => strlen($captionContent),
                                    ]);
                                    break; // Found the file, no need to try other names
                                } else {
                                    Log::debug('Caption response is not valid content for missing language', [
                                        'model_id' => $model->id,
                                        'language' => $requestedLanguage,
                                        'file_name' => $fileName,
                                        'response_preview' => substr($captionContent, 0, 200),
                                    ]);
                                }
                            } else {
                                Log::debug('Caption download failed from Storage API for missing language', [
                                    'model_id' => $model->id,
                                    'language' => $requestedLanguage,
                                    'file_name' => $fileName,
                                    'status' => $captionResponse->status(),
                                ]);
                            }
                        } catch (\Exception $e) {
                            Log::debug('Caption download exception from Storage API for missing language', [
                                'model_id' => $model->id,
                                'language' => $requestedLanguage,
                                'file_name' => $fileName,
                                'error' => $e->getMessage(),
                            ]);
                            continue;
                        }
                    }
                } else {
                    Log::warning('Cannot download missing language from Storage API - missing configuration', [
                        'model_id' => $model->id,
                        'language' => $requestedLanguage,
                        'storage_zone_name' => $storageZoneName ? 'SET' : 'NOT SET',
                        'storage_access_key' => $storageAccessKey ? 'SET' : 'NOT SET',
                    ]);
                }
            }
            
            // If we found transcriptions, save them and return
            if (!empty($transcriptions)) {
                Log::info('Saving existing transcriptions from Bunny.net to database', [
                    'model_id' => $model->id,
                    'languages_found' => array_keys($transcriptions),
                ]);
                
                // Save transcriptions to database
                $this->saveTranscriptionsToDatabase($model, $transcriptions, $captionUrls, $audioUrls, $sourceLanguage);
                
                return [
                    'success' => true,
                    'message' => 'Transcriptions downloaded and saved from Bunny.net successfully',
                    'data' => [
                        'transcriptions' => $transcriptions,
                        'caption_urls' => $captionUrls,
                        'languages_processed' => array_keys($transcriptions),
                        'source' => 'bunny_existing',
                    ],
                ];
            }
            
            // Step 2: If no transcriptions found in Bunny.net, return error message
            $errorDetails = [
                'model_id' => $model->id,
                'bunny_video_id' => $bunnyVideoId,
                'video_data_success' => $videoData['success'] ?? false,
                'captions_count' => count($videoData['captions'] ?? []),
            ];
            
            // Add more debugging info if video data was fetched successfully
            if ($videoData['success'] && isset($videoData['data'])) {
                $errorDetails['available_fields'] = array_keys($videoData['data']);
                $errorDetails['has_captions_field'] = isset($videoData['data']['captions']);
                if (isset($videoData['data']['captions'])) {
                    $errorDetails['captions_type'] = gettype($videoData['data']['captions']);
                    if (is_array($videoData['data']['captions'])) {
                        $errorDetails['captions_structure'] = array_map(function($cap) {
                            return array_keys($cap);
                        }, $videoData['data']['captions']);
                    }
                }
            }
            
            Log::warning('No transcriptions found in Bunny.net', $errorDetails);
            
            // Update status to failed
            DB::table($model->getTable())
                ->where('id', $model->id)
                ->update([
                    'transcription_status' => 'failed',
                    'transcription_error' => 'No transcriptions found in Bunny.net. Please ensure captions are uploaded to the video in Bunny.net dashboard. Check logs for details.',
                    'updated_at' => now(),
                ]);
            
            return [
                'success' => false,
                'message' => 'No transcriptions found in Bunny.net for this video. Please ensure captions/subtitles are uploaded to the video in Bunny.net dashboard, then try again. Check Laravel logs for detailed information.',
                'data' => [
                    'languages_processed' => [],
                    'debug_info' => [
                        'bunny_video_id' => $bunnyVideoId,
                        'video_fetch_success' => $videoData['success'] ?? false,
                        'captions_found' => count($videoData['captions'] ?? []),
                    ],
                ],
            ];

        } catch (Exception $e) {
            Log::error('Video transcription processing failed', [
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Update status to failed
            DB::table($model->getTable())
                ->where('id', $model->id)
                ->update([
                    'transcription_status' => 'failed',
                    'transcription_error' => $e->getMessage(),
                    'updated_at' => now(),
                ]);

            return [
                'success' => false,
                'message' => 'Failed to process transcriptions: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Parse VTT or SRT content to extract plain text
     * 
     * @param string $content VTT or SRT file content
     * @return string Plain text transcription
     */
    protected function parseVTTToText(string $content): string
    {
        $lines = explode("\n", $content);
        $text = [];
        $isSRT = false;
        
        // Detect format: SRT files start with sequence numbers, VTT files start with WEBVTT
        $firstNonEmptyLine = '';
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (!empty($trimmed)) {
                $firstNonEmptyLine = $trimmed;
                break;
            }
        }
        
        if (is_numeric($firstNonEmptyLine) || strpos($firstNonEmptyLine, 'WEBVTT') === false) {
            $isSRT = true;
        }
        
        Log::info('Parsing subtitle file', [
            'format' => $isSRT ? 'SRT' : 'VTT',
            'first_line' => substr($firstNonEmptyLine, 0, 50),
            'total_lines' => count($lines),
        ]);
        
        if ($isSRT) {
            // Parse SRT format
            // SRT format:
            // 1
            // 00:00:00,000 --> 00:00:05,000
            // Text line 1
            // Text line 2
            // (empty line)
            
            $i = 0;
            while ($i < count($lines)) {
                $line = trim($lines[$i]);
                
                // Skip empty lines
                if (empty($line)) {
                    $i++;
                    continue;
                }
                
                // Skip sequence numbers (numeric lines)
                if (is_numeric($line)) {
                    $i++;
                    // Next line should be timestamp
                    if ($i < count($lines)) {
                        $timestampLine = trim($lines[$i]);
                        // Check if it's a timestamp line (format: 00:00:00,000 --> 00:00:05,000)
                        if (preg_match('/^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/', $timestampLine)) {
                            $i++;
                            // Now collect text lines until empty line
                            while ($i < count($lines)) {
                                $textLine = trim($lines[$i]);
                                if (empty($textLine)) {
                                    break; // Empty line indicates end of subtitle block
                                }
                                // Remove HTML tags if any
                                $cleanLine = strip_tags($textLine);
                                $cleanLine = trim($cleanLine);
                                if (!empty($cleanLine)) {
                                    $text[] = $cleanLine;
                                }
                                $i++;
                            }
                        }
                    }
                } else {
                    // If not a sequence number, might be text (handle edge cases)
                    $cleanLine = strip_tags($line);
                    $cleanLine = trim($cleanLine);
                    if (!empty($cleanLine) && !preg_match('/^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/', $cleanLine)) {
                        $text[] = $cleanLine;
                    }
                    $i++;
                }
            }
        } else {
            // Parse VTT format
            foreach ($lines as $line) {
                $line = trim($line);
                
                // Skip WEBVTT header, empty lines, and timestamp lines
                if (empty($line) || 
                    $line === 'WEBVTT' || 
                    strpos($line, 'WEBVTT') === 0 ||
                    strpos($line, 'NOTE') === 0 ||
                    preg_match('/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/', $line)) {
                    continue;
                }
                
                // Remove HTML tags and add text
                $cleanLine = strip_tags($line);
                $cleanLine = trim($cleanLine);
                
                if (!empty($cleanLine)) {
                    $text[] = $cleanLine;
                }
            }
        }
        
        $result = implode(' ', $text);
        
        // Clean up: Remove numbers at the end of sentences (like "2, 3, .." from SRT sequence numbers)
        // Pattern: Remove trailing numbers, commas, and spaces at the end of sentences
        $result = preg_replace('/\s*[,\s]*\d+\s*$/m', '', $result);
        // Also remove standalone numbers at the end of text segments
        $result = preg_replace('/\s+\d+(\s|$)/', ' ', $result);
        // Clean up multiple spaces
        $result = preg_replace('/\s+/', ' ', $result);
        $result = trim($result);
        
        Log::info('Subtitle parsing completed', [
            'format' => $isSRT ? 'SRT' : 'VTT',
            'text_length' => strlen($result),
            'text_preview' => substr($result, 0, 100),
        ]);
        
        return $result;
    }

    /**
     * Save transcriptions to database
     * 
     * @param mixed $model Video, Reel, or Rewind model
     * @param array $transcriptions Transcription data
     * @param array $captionUrls Caption URLs
     * @param array $audioUrls Audio URLs
     * @param string $sourceLanguage Source language
     * @return void
     */
    protected function saveTranscriptionsToDatabase($model, array $transcriptions, array $captionUrls, array $audioUrls, string $sourceLanguage): void
    {
        try {
            $dbUpdateData = [
                'transcriptions' => json_encode($transcriptions, JSON_UNESCAPED_UNICODE),
                'caption_urls' => json_encode($captionUrls, JSON_UNESCAPED_UNICODE),
                'audio_urls' => json_encode($audioUrls, JSON_UNESCAPED_UNICODE),
                'source_language' => $sourceLanguage,
                'transcription_status' => 'completed',
                'transcription_processed_at' => now(),
                'transcription_error' => null,
                'updated_at' => now(),
            ];
            
            // For Video model, also save to old transcription fields
            if ($model instanceof \App\Models\Video) {
                $transcriptionText = null;
                $transcriptionEn = null;
                $transcriptionEs = null;
                $transcriptionPt = null;
                
                if (isset($transcriptions['en']) && is_array($transcriptions['en'])) {
                    $transcriptionEn = $transcriptions['en']['text'] ?? null;
                    if (!$transcriptionText) {
                        $transcriptionText = $transcriptionEn;
                    }
                }
                
                if (isset($transcriptions['es']) && is_array($transcriptions['es'])) {
                    $transcriptionEs = $transcriptions['es']['text'] ?? null;
                }
                
                if (isset($transcriptions['pt']) && is_array($transcriptions['pt'])) {
                    $transcriptionPt = $transcriptions['pt']['text'] ?? null;
                }
                
                if ($sourceLanguage !== 'en' && isset($transcriptions[$sourceLanguage]) && is_array($transcriptions[$sourceLanguage])) {
                    $transcriptionText = $transcriptions[$sourceLanguage]['text'] ?? $transcriptionText;
                }
                
                $dbUpdateData['transcription'] = $transcriptionText;
                $dbUpdateData['transcription_en'] = $transcriptionEn;
                $dbUpdateData['transcription_es'] = $transcriptionEs;
                $dbUpdateData['transcription_pt'] = $transcriptionPt;
            }
            
            DB::table($model->getTable())
                ->where('id', $model->id)
                ->update($dbUpdateData);
            
            $model->refresh();
            
            Log::info('Transcriptions saved to database successfully', [
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'languages_saved' => array_keys($transcriptions),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to save transcriptions to database', [
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get Bunny.net video URL from model
     */
    protected function getBunnyVideoUrl($model): ?string
    {
        // Try different URL fields
        if (!empty($model->bunny_video_url)) {
            return $model->bunny_video_url;
        }

        if (!empty($model->bunny_embed_url)) {
            // Convert embed URL to video URL if needed
            return $model->bunny_embed_url;
        }

        if (!empty($model->bunny_player_url)) {
            return $model->bunny_player_url;
        }

        return null;
    }

    /**
     * Upload caption to Bunny.net and return the result
     */
    protected function uploadCaptionToBunny(string $videoId, string $vttContent, string $language, string $label): array
    {
        try {
            $result = $this->bunnyNetService->uploadCaptions($videoId, $vttContent, $language, $label);
            
            if ($result['success']) {
                // Generate caption URL (Bunny.net may not return it, so we construct it)
                $libraryId = $this->bunnyNetService->getLibraryId();
                $captionUrl = "https://vz-{$libraryId}.b-cdn.net/{$videoId}/captions/{$language}.vtt";
                
                return [
                    'success' => true,
                    'url' => $captionUrl,
                    'message' => $result['message'] ?? 'Caption uploaded successfully',
                ];
            }

            return $result;

        } catch (Exception $e) {
            Log::error('Caption upload exception', [
                'video_id' => $videoId,
                'language' => $language,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception during caption upload: ' . $e->getMessage(),
                'url' => null,
            ];
        }
    }

    /**
     * Get human-readable language label
     */
    protected function getLanguageLabel(string $languageCode): string
    {
        // Use short language codes to avoid duplicates in Bunny.net caption menu
        // Bunny.net will show: EN, ES, PT (not English, Español, Português)
        $labels = [
            'en' => 'EN',
            'es' => 'ES',
            'pt' => 'PT',
            'fr' => 'FR',
            'de' => 'DE',
            'it' => 'IT',
        ];

        return $labels[$languageCode] ?? strtoupper($languageCode);
    }

    /**
     * Re-process transcription for a specific language
     */
    public function reprocessLanguage($model, string $language, string $sourceLanguage = 'en'): array
    {
        try {
            $videoUrl = $this->getBunnyVideoUrl($model);
            $bunnyVideoId = $model->bunny_video_id;

            if (!$videoUrl || !$bunnyVideoId) {
                throw new Exception('Video URL or Bunny.net ID not found');
            }

            $transcriptions = $model->transcriptions ?? [];
            $captionUrls = $model->caption_urls ?? [];

            if ($language === $sourceLanguage) {
                // Re-transcribe source language
                $result = $this->deepgramService->transcribeFromUrl($videoUrl, $language);
                
                if (!$result['success']) {
                    throw new Exception('Transcription failed: ' . ($result['error'] ?? 'Unknown error'));
                }

                $transcriptions[$language] = [
                    'text' => $result['transcription'],
                    'vtt' => $result['vtt'],
                    'processed_at' => now()->toDateTimeString(),
                ];

                $vttContent = $result['vtt'];

            } else {
                // Re-translate from source language
                if (!isset($transcriptions[$sourceLanguage])) {
                    throw new Exception('Source language transcription not found. Please process source language first.');
                }

                $sourceTranscription = $transcriptions[$sourceLanguage]['text'];
                $sourceVTT = $transcriptions[$sourceLanguage]['vtt'];

                $translationResult = $this->deepgramService->translateText($sourceTranscription, $language, $sourceLanguage);
                $translatedVTT = $this->deepgramService->translateWebVTT($sourceVTT, $language, $sourceLanguage);

                $transcriptions[$language] = [
                    'text' => $translationResult['translated_text'] ?? $sourceTranscription,
                    'vtt' => $translatedVTT,
                    'processed_at' => now()->toDateTimeString(),
                    'translated_from' => $sourceLanguage,
                ];

                $vttContent = $translatedVTT;
            }

            // Upload to Bunny.net
            $uploadResult = $this->uploadCaptionToBunny(
                $bunnyVideoId,
                $vttContent,
                $language,
                $this->getLanguageLabel($language)
            );

            if ($uploadResult['success']) {
                $captionUrls[$language] = $uploadResult['url'] ?? null;
                $transcriptions[$language]['bunny_caption_url'] = $uploadResult['url'] ?? null;
            }

            // Update model
            $model->update([
                'transcriptions' => $transcriptions,
                'caption_urls' => $captionUrls,
            ]);

            return [
                'success' => true,
                'message' => "Language {$language} reprocessed successfully",
                'data' => $transcriptions[$language],
            ];

        } catch (Exception $e) {
            Log::error('Language reprocessing failed', [
                'model_id' => $model->id,
                'language' => $language,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Reprocessing failed: ' . $e->getMessage(),
                'data' => null,
            ];
        }
    }

    /**
     * Get transcription status for a model
     */
    public function getTranscriptionStatus($model): array
    {
        return [
            'status' => $model->transcription_status ?? 'pending',
            'processed_at' => $model->transcription_processed_at,
            'error' => $model->transcription_error,
            'languages' => array_keys($model->transcriptions ?? []),
            'caption_urls' => $model->caption_urls ?? [],
        ];
    }
}

