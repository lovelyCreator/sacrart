<?php

namespace App\Services;

use App\Models\Video;
use App\Models\Reel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
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
            // Update status to processing
            $model->update([
                'transcription_status' => 'processing',
                'transcription_error' => null,
            ]);

            // Get Bunny.net video ID
            $bunnyVideoId = $model->bunny_video_id;
            
            if (!$bunnyVideoId) {
                throw new Exception('No Bunny.net video ID found');
            }

            Log::info('Attempting to get video URL for transcription', [
                'model_id' => $model->id,
                'bunny_video_id' => $bunnyVideoId,
                'storage_zone_configured' => !empty(config('services.bunny.storage_zone_name')),
                'storage_key_configured' => !empty(config('services.bunny.storage_access_key')),
            ]);

            // Get signed HLS URL for transcription (bypasses Bunny.net security)
            $videoUrl = $this->bunnyNetService->getSignedTranscriptionUrl($bunnyVideoId, 120); // 120 minutes = 2 hours
            
            if (!$videoUrl) {
                Log::error('getSignedTranscriptionUrl returned null - Cannot generate transcription URL', [
                    'model_id' => $model->id,
                    'bunny_video_id' => $bunnyVideoId,
                    'BUNNY_STORAGE_ZONE_NAME' => config('services.bunny.storage_zone_name') ? 'SET' : 'NOT SET',
                    'BUNNY_STORAGE_ACCESS_KEY' => config('services.bunny.storage_access_key') ? 'SET (length: ' . strlen(config('services.bunny.storage_access_key')) . ')' : 'NOT SET',
                    'BUNNY_CDN_URL' => config('services.bunny.cdn_url'),
                    'possible_causes' => [
                        '1. Video is still being processed by Bunny.net',
                        '2. MP4 Fallback is not enabled in Bunny.net Stream settings',
                        '3. Video files (play_720p.mp4, etc.) do not exist in storage',
                        '4. Storage Access Key is incorrect or expired',
                    ],
                    'fix_instructions' => 'Check Bunny.net Dashboard → Stream → Video Library → Your Video → Check if processing is complete and MP4 files exist',
                ]);
                
                throw new Exception(
                    'Cannot find accessible video file for transcription. ' .
                    'Possible causes: ' .
                    '1) Video is still being processed by Bunny.net, ' .
                    '2) MP4 Fallback is not enabled in Bunny.net Stream settings, ' .
                    '3) Storage configuration is incorrect. ' .
                    'Please wait for video processing to complete or check Bunny.net settings.'
                );
            }
            
            Log::info('Using Bunny Storage API URL for Deepgram', [
                'model_id' => $model->id,
                'video_id' => $bunnyVideoId,
                'url_length' => strlen($videoUrl),
                'url_preview' => substr($videoUrl, 0, 80) . '...',
                'has_access_key' => strpos($videoUrl, 'accessKey=') !== false,
            ]);

            Log::info('Starting video transcription processing', [
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'video_url' => $videoUrl,
                'bunny_video_id' => $bunnyVideoId,
                'languages' => $languages,
                'source_language' => $sourceLanguage,
            ]);

            $transcriptions = [];
            $captionUrls = [];
            $audioUrls = [];

            // Step 1: Transcribe video in ALL languages using Deepgram directly
            // This gives us properly timed captions in each language without translation issues
            Log::info('Starting multi-language transcription with Deepgram', [
                'model_id' => $model->id,
                'languages' => $languages,
                'source_language' => $sourceLanguage,
            ]);

            // Get Bunny.net HLS URL for the source language audio (original video audio)
            $bunnyHlsUrl = $this->bunnyNetService->getHlsUrl($bunnyVideoId);
            Log::info("Bunny.net HLS URL for original audio", [
                'model_id' => $model->id,
                'hls_url' => $bunnyHlsUrl,
            ]);

            foreach ($languages as $lang) {
                try {
                    Log::info("Transcribing video in {$lang}", [
                        'model_id' => $model->id,
                        'language' => $lang,
                        'is_source_language' => $lang === $sourceLanguage,
                    ]);

                    // Transcribe the video directly in this language using Deepgram
                    $transcriptionResult = $this->deepgramService->transcribeFromUrl($videoUrl, $lang);

                    if (!$transcriptionResult['success']) {
                        throw new Exception('Deepgram transcription failed: ' . ($transcriptionResult['error'] ?? 'Unknown error'));
                    }

                    // Verify transcription is a string, not an array
                    $transcriptionText = $transcriptionResult['transcription'];
                    $transcriptionVTT = $transcriptionResult['vtt'];
                    
                    if (!is_string($transcriptionText)) {
                        Log::error("Transcription text is NOT a string!", [
                            'lang' => $lang,
                            'type' => gettype($transcriptionText),
                            'is_array' => is_array($transcriptionText),
                        ]);
                        throw new Exception("Transcription text for {$lang} is not a string (got " . gettype($transcriptionText) . ")");
                    }
                    
                    if (!is_string($transcriptionVTT)) {
                        Log::error("Transcription VTT is NOT a string!", [
                            'lang' => $lang,
                            'type' => gettype($transcriptionVTT),
                        ]);
                        throw new Exception("Transcription VTT for {$lang} is not a string (got " . gettype($transcriptionVTT) . ")");
                    }
                    
                    // Store transcription
                    $transcriptions[$lang] = [
                        'text' => $transcriptionText,
                        'vtt' => $transcriptionVTT,
                        'processed_at' => now()->toDateTimeString(),
                        'method' => 'deepgram_native', // Native Deepgram transcription (not translation)
                    ];

                    Log::info("Successfully transcribed video in {$lang}", [
                        'model_id' => $model->id,
                        'text_type' => gettype($transcriptionText),
                        'text_length' => strlen($transcriptionText),
                        'text_preview' => substr($transcriptionText, 0, 100),
                        'vtt_length' => strlen($transcriptionVTT),
                    ]);

                    // Upload caption to Bunny.net
                    $uploadResult = $this->uploadCaptionToBunny(
                        $bunnyVideoId,
                        $transcriptionResult['vtt'],
                        $lang,
                        $this->getLanguageLabel($lang)
                    );

                    if ($uploadResult['success']) {
                        $captionUrls[$lang] = $uploadResult['url'] ?? null;
                        $transcriptions[$lang]['bunny_caption_url'] = $uploadResult['url'] ?? null;
                        
                        Log::info("Caption uploaded to Bunny.net for {$lang}", [
                            'model_id' => $model->id,
                            'url' => $uploadResult['url'] ?? null,
                        ]);
                    } else {
                        Log::warning("Failed to upload caption to Bunny.net for {$lang}", [
                            'model_id' => $model->id,
                            'error' => $uploadResult['message'] ?? 'Unknown error',
                        ]);
                    }

                    // Handle audio: Use original for source language, TTS for others
                    if ($lang === $sourceLanguage) {
                        // For source language: Use original Bunny.net video audio (no TTS needed)
                        $audioUrls[$lang] = 'original'; // Special marker to use video's original audio
                        $transcriptions[$lang]['audio_url'] = 'original';
                        $transcriptions[$lang]['audio_type'] = 'original';
                        $transcriptions[$lang]['bunny_hls_url'] = $bunnyHlsUrl;
                        
                        Log::info("Using original video audio for source language: {$lang}", [
                            'model_id' => $model->id,
                            'hls_url' => $bunnyHlsUrl,
                        ]);
                    } else {
                        // For other languages: Generate TTS audio
                        try {
                            Log::info("Generating TTS audio for {$lang}", [
                                'model_id' => $model->id,
                                'text_length' => strlen($transcriptionResult['transcription']),
                            ]);

                            $ttsResult = $this->deepgramService->textToSpeech(
                                $transcriptionResult['transcription'],
                                $lang
                            );

                            if ($ttsResult['success']) {
                                $audioUrls[$lang] = $ttsResult['audio_url'];
                                $transcriptions[$lang]['audio_url'] = $ttsResult['audio_url'];
                                $transcriptions[$lang]['audio_path'] = $ttsResult['audio_path'];
                                $transcriptions[$lang]['audio_type'] = 'tts';
                                
                                Log::info("TTS audio generated for {$lang}", [
                                    'model_id' => $model->id,
                                    'audio_url' => $ttsResult['audio_url'],
                                    'file_size' => filesize($ttsResult['audio_path']),
                                ]);
                            } else {
                                Log::warning("TTS failed for {$lang}", [
                                    'model_id' => $model->id,
                                    'error' => $ttsResult['error'] ?? 'Unknown TTS error',
                                ]);
                            }
                        } catch (Exception $ttsError) {
                            Log::warning("TTS generation failed for {$lang}", [
                                'model_id' => $model->id,
                                'error' => $ttsError->getMessage(),
                            ]);
                            // Continue even if TTS fails - captions still work
                        }
                    }

                    Log::info("Completed processing language: {$lang}", [
                        'model_id' => $model->id,
                        'has_caption' => isset($captionUrls[$lang]),
                        'has_audio' => isset($audioUrls[$lang]),
                    ]);

                } catch (Exception $e) {
                    Log::error("Failed to process language: {$lang}", [
                        'model_id' => $model->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    
                    // Store error but continue with other languages
                    $transcriptions[$lang] = [
                        'error' => $e->getMessage(),
                        'processed_at' => now()->toDateTimeString(),
                    ];
                }
            }

            // Step 2: Update model with transcription data
            $model->update([
                'transcriptions' => $transcriptions,
                'caption_urls' => $captionUrls,
                'audio_urls' => $audioUrls,
                'source_language' => $sourceLanguage,
                'transcription_status' => 'completed',
                'transcription_processed_at' => now(),
            ]);

            Log::info('Video transcription processing completed', [
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'languages_processed' => array_keys($transcriptions),
            ]);

            return [
                'success' => true,
                'message' => 'Video transcription and captions processed successfully',
                'data' => [
                    'transcriptions' => $transcriptions,
                    'caption_urls' => $captionUrls,
                    'languages_processed' => array_keys($transcriptions),
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
            $model->update([
                'transcription_status' => 'failed',
                'transcription_error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Video transcription processing failed: ' . $e->getMessage(),
                'data' => null,
            ];
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

