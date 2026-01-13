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

            // Step 1: Transcribe video in source language only using Deepgram
            Log::info('Starting transcription in source language with Deepgram', [
                'model_id' => $model->id,
                'source_language' => $sourceLanguage,
            ]);

            // Get Bunny.net HLS URL for the source language audio (original video audio)
            $bunnyHlsUrl = $this->bunnyNetService->getHlsUrl($bunnyVideoId);
            Log::info("Bunny.net HLS URL for original audio", [
                'model_id' => $model->id,
                'hls_url' => $bunnyHlsUrl,
            ]);

            // First, transcribe only in the source language
            try {
                Log::info("Transcribing video in source language: {$sourceLanguage}", [
                    'model_id' => $model->id,
                    'language' => $sourceLanguage,
                ]);

                // Transcribe the video in source language using Deepgram
                $transcriptionResult = $this->deepgramService->transcribeFromUrl($videoUrl, $sourceLanguage);

                if (!$transcriptionResult['success']) {
                    throw new Exception('Deepgram transcription failed: ' . ($transcriptionResult['error'] ?? 'Unknown error'));
                }

                // Verify transcription is a string, not an array
                $sourceTranscriptionText = $transcriptionResult['transcription'];
                $sourceTranscriptionVTT = $transcriptionResult['vtt'];
                
                if (!is_string($sourceTranscriptionText)) {
                    Log::error("Source transcription text is NOT a string!", [
                        'lang' => $sourceLanguage,
                        'type' => gettype($sourceTranscriptionText),
                        'is_array' => is_array($sourceTranscriptionText),
                    ]);
                    throw new Exception("Source transcription text is not a string (got " . gettype($sourceTranscriptionText) . ")");
                }
                
                if (!is_string($sourceTranscriptionVTT)) {
                    Log::error("Source transcription VTT is NOT a string!", [
                        'lang' => $sourceLanguage,
                        'type' => gettype($sourceTranscriptionVTT),
                    ]);
                    throw new Exception("Source transcription VTT is not a string (got " . gettype($sourceTranscriptionVTT) . ")");
                }
                
                // Store source language transcription
                $transcriptions[$sourceLanguage] = [
                    'text' => $sourceTranscriptionText,
                    'vtt' => $sourceTranscriptionVTT,
                    'processed_at' => now()->toDateTimeString(),
                    'method' => 'deepgram_native',
                ];

                Log::info("Successfully transcribed video in source language: {$sourceLanguage}", [
                    'model_id' => $model->id,
                    'text_length' => strlen($sourceTranscriptionText),
                    'vtt_length' => strlen($sourceTranscriptionVTT),
                ]);

                // Upload source language caption to Bunny.net
                $uploadResult = $this->uploadCaptionToBunny(
                    $bunnyVideoId,
                    $sourceTranscriptionVTT,
                    $sourceLanguage,
                    $this->getLanguageLabel($sourceLanguage)
                );

                if ($uploadResult['success']) {
                    $captionUrls[$sourceLanguage] = $uploadResult['url'] ?? null;
                    $transcriptions[$sourceLanguage]['bunny_caption_url'] = $uploadResult['url'] ?? null;
                    
                    Log::info("Caption uploaded to Bunny.net for source language: {$sourceLanguage}", [
                        'model_id' => $model->id,
                        'url' => $uploadResult['url'] ?? null,
                    ]);
                } else {
                    Log::warning("Failed to upload caption to Bunny.net for source language: {$sourceLanguage}", [
                        'model_id' => $model->id,
                        'error' => $uploadResult['message'] ?? 'Unknown error',
                    ]);
                }

                // For source language: Use original Bunny.net video audio (no TTS needed)
                $audioUrls[$sourceLanguage] = 'original'; // Special marker to use video's original audio
                $transcriptions[$sourceLanguage]['audio_url'] = 'original';
                $transcriptions[$sourceLanguage]['audio_type'] = 'original';
                $transcriptions[$sourceLanguage]['bunny_hls_url'] = $bunnyHlsUrl;
                
                Log::info("Using original video audio for source language: {$sourceLanguage}", [
                    'model_id' => $model->id,
                    'hls_url' => $bunnyHlsUrl,
                ]);

            } catch (Exception $e) {
                Log::error("Failed to transcribe source language: {$sourceLanguage}", [
                    'model_id' => $model->id,
                    'error' => $e->getMessage(),
                ]);
                throw $e; // Can't continue without source transcription
            }

            // Step 2: Translate source transcription to other languages
            foreach ($languages as $lang) {
                // Skip source language (already done)
                if ($lang === $sourceLanguage) {
                    continue;
                }

                try {
                    Log::info("Translating transcription to {$lang}", [
                        'model_id' => $model->id,
                        'target_language' => $lang,
                        'source_language' => $sourceLanguage,
                    ]);

                    // Translate the transcription text
                    $translationResult = $this->deepgramService->translateText(
                        $sourceTranscriptionText,
                        $lang,
                        $sourceLanguage
                    );

                    if (!$translationResult['success']) {
                        throw new Exception('Translation failed: ' . ($translationResult['error'] ?? 'Unknown error'));
                    }

                    $translatedText = $translationResult['translated_text'] ?? $sourceTranscriptionText;

                    // Translate the WebVTT file
                    $translatedVTT = $this->deepgramService->translateWebVTT(
                        $sourceTranscriptionVTT,
                        $lang,
                        $sourceLanguage
                    );

                    // Verify translated text is a string
                    if (!is_string($translatedText)) {
                        Log::error("Translated text is NOT a string!", [
                            'lang' => $lang,
                            'type' => gettype($translatedText),
                        ]);
                        throw new Exception("Translated text for {$lang} is not a string (got " . gettype($translatedText) . ")");
                    }
                    
                    if (!is_string($translatedVTT)) {
                        Log::error("Translated VTT is NOT a string!", [
                            'lang' => $lang,
                            'type' => gettype($translatedVTT),
                        ]);
                        throw new Exception("Translated VTT for {$lang} is not a string (got " . gettype($translatedVTT) . ")");
                    }
                    
                    // Store translated transcription
                    $transcriptions[$lang] = [
                        'text' => $translatedText,
                        'vtt' => $translatedVTT,
                        'processed_at' => now()->toDateTimeString(),
                        'method' => 'translated',
                        'translated_from' => $sourceLanguage,
                    ];

                    Log::info("Successfully translated transcription to {$lang}", [
                        'model_id' => $model->id,
                        'text_type' => gettype($translatedText),
                        'text_length' => strlen($translatedText),
                        'text_preview' => substr($translatedText, 0, 100),
                        'vtt_length' => strlen($translatedVTT),
                    ]);

                    // Upload translated caption to Bunny.net
                    $uploadResult = $this->uploadCaptionToBunny(
                        $bunnyVideoId,
                        $translatedVTT,
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

                    // Generate TTS audio for translated languages
                    try {
                        Log::info("Generating TTS audio for {$lang}", [
                            'model_id' => $model->id,
                            'text_length' => strlen($translatedText),
                        ]);

                        $ttsResult = $this->deepgramService->textToSpeech(
                            $translatedText,
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

                    Log::info("Completed processing language: {$lang}", [
                        'model_id' => $model->id,
                        'has_caption' => isset($captionUrls[$lang]),
                        'has_audio' => isset($audioUrls[$lang]),
                    ]);

                } catch (Exception $e) {
                    Log::error("Failed to translate language: {$lang}", [
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
            try {
                $updateData = [
                    'transcriptions' => $transcriptions,
                    'caption_urls' => $captionUrls,
                    'audio_urls' => $audioUrls,
                    'source_language' => $sourceLanguage,
                    'transcription_status' => 'completed',
                    'transcription_processed_at' => now(),
                    'transcription_error' => null,
                ];

                Log::info('Attempting to save transcription data to database', [
                    'model_type' => get_class($model),
                    'model_id' => $model->id,
                    'transcriptions_count' => count($transcriptions),
                    'caption_urls_count' => count($captionUrls),
                    'audio_urls_count' => count($audioUrls),
                    'update_data_keys' => array_keys($updateData),
                ]);

                // Use DB transaction to ensure data is saved
                // Use direct DB update to bypass any model-level restrictions
                DB::beginTransaction();
                try {
                    // First, let's check if the model can be updated
                    foreach ($updateData as $key => $value) {
                        if (!in_array($key, $model->getFillable())) {
                            Log::warning('Field not in fillable array, will use direct DB update', [
                                'field' => $key,
                                'fillable_fields' => $model->getFillable(),
                            ]);
                        }
                    }

                    // Skip model save entirely - use direct DB update only
                    // This bypasses any model-level restrictions, events, or observers that might interfere
                    // Model events (like Video's 'saved' event that updates series statistics) can interfere with transcription saves
                    
                    // Prepare update data
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
                    
                    // For Video model, also save to old transcription fields (transcription, transcription_en, transcription_es, transcription_pt)
                    // This ensures compatibility with EpisodeDetail and RewindEpisodes pages
                    if ($model instanceof \App\Models\Video) {
                        // Extract text from transcriptions JSON for each language
                        $transcriptionText = null;
                        $transcriptionEn = null;
                        $transcriptionEs = null;
                        $transcriptionPt = null;
                        
                        if (isset($transcriptions['en']) && is_array($transcriptions['en'])) {
                            $transcriptionEn = $transcriptions['en']['text'] ?? null;
                            // Use English as default transcription
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
                        
                        // If source language is not English, use it as default transcription
                        if ($sourceLanguage !== 'en' && isset($transcriptions[$sourceLanguage]) && is_array($transcriptions[$sourceLanguage])) {
                            $transcriptionText = $transcriptions[$sourceLanguage]['text'] ?? $transcriptionText;
                        }
                        
                        // Add old transcription fields to update data
                        $dbUpdateData['transcription'] = $transcriptionText;
                        $dbUpdateData['transcription_en'] = $transcriptionEn;
                        $dbUpdateData['transcription_es'] = $transcriptionEs;
                        $dbUpdateData['transcription_pt'] = $transcriptionPt;
                        
                        Log::info('Saving transcriptions to old fields for Video model', [
                            'video_id' => $model->id,
                            'transcription_length' => $transcriptionText ? strlen($transcriptionText) : 0,
                            'transcription_en_length' => $transcriptionEn ? strlen($transcriptionEn) : 0,
                            'transcription_es_length' => $transcriptionEs ? strlen($transcriptionEs) : 0,
                            'transcription_pt_length' => $transcriptionPt ? strlen($transcriptionPt) : 0,
                        ]);
                    }
                    
                    $directUpdate = DB::table($model->getTable())
                        ->where('id', $model->id)
                        ->update($dbUpdateData);
                    
                    if ($directUpdate === 0) {
                        DB::rollBack();
                        Log::error('Direct DB update affected 0 rows', [
                            'model_type' => get_class($model),
                            'model_id' => $model->id,
                            'table' => $model->getTable(),
                        ]);
                        throw new Exception('Direct DB update affected 0 rows - video may not exist');
                    }

                    // Commit the transaction
                    DB::commit();
                    
                    Log::info('Direct DB update completed successfully', [
                        'model_id' => $model->id,
                        'rows_affected' => $directUpdate,
                    ]);

                    // Verify the data was saved by querying directly from database
                    $model->refresh();
                    
                    // Select fields based on model type
                    $selectFields = ['transcriptions', 'caption_urls', 'audio_urls', 'transcription_status', 'source_language'];
                    if ($model instanceof \App\Models\Video) {
                        $selectFields = array_merge($selectFields, ['transcription', 'transcription_en', 'transcription_es', 'transcription_pt']);
                    }
                    
                    $dbCheck = DB::table($model->getTable())
                        ->where('id', $model->id)
                        ->select($selectFields)
                        ->first();
                    
                    if (!$dbCheck) {
                        throw new Exception('Could not verify saved data - video not found in database');
                    }
                    
                    $savedTranscriptions = $dbCheck->transcriptions ? json_decode($dbCheck->transcriptions, true) : null;
                    $savedCaptionUrls = $dbCheck->caption_urls ? json_decode($dbCheck->caption_urls, true) : null;
                    $savedAudioUrls = $dbCheck->audio_urls ? json_decode($dbCheck->audio_urls, true) : null;
                    
                    $logData = [
                        'model_type' => get_class($model),
                        'model_id' => $model->id,
                        'saved_transcriptions_keys' => is_array($savedTranscriptions) ? array_keys($savedTranscriptions) : 'not_array',
                        'saved_transcriptions_type' => gettype($savedTranscriptions),
                        'saved_caption_urls' => is_array($savedCaptionUrls) ? array_keys($savedCaptionUrls) : 'not_array',
                        'saved_audio_urls' => is_array($savedAudioUrls) ? array_keys($savedAudioUrls) : 'not_array',
                        'transcription_status' => $dbCheck->transcription_status,
                        'source_language' => $dbCheck->source_language,
                        'transcriptions_preview' => is_array($savedTranscriptions) ? array_slice($savedTranscriptions, 0, 1) : null,
                    ];
                    
                    // Add old field verification for Video model
                    if ($model instanceof \App\Models\Video) {
                        $logData['transcription_length'] = $dbCheck->transcription ? strlen($dbCheck->transcription) : 0;
                        $logData['transcription_en_length'] = $dbCheck->transcription_en ? strlen($dbCheck->transcription_en) : 0;
                        $logData['transcription_es_length'] = $dbCheck->transcription_es ? strlen($dbCheck->transcription_es) : 0;
                        $logData['transcription_pt_length'] = $dbCheck->transcription_pt ? strlen($dbCheck->transcription_pt) : 0;
                    }
                    
                    Log::info('Database verification query result - data confirmed saved', $logData);
                    
                    // Also refresh model to sync with database
                    $model->refresh();

                } catch (\Exception $saveException) {
                    DB::rollBack();
                    throw $saveException;
                }

            } catch (\Exception $updateException) {
                Log::error('Exception while saving transcription data', [
                    'model_type' => get_class($model),
                    'model_id' => $model->id,
                    'error' => $updateException->getMessage(),
                    'trace' => $updateException->getTraceAsString(),
                ]);
                throw $updateException;
            }

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

