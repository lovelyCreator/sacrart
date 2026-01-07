<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class DeepgramService
{
    protected $apiKey;
    protected $baseUrl = 'https://api.deepgram.com/v1';

    public function __construct()
    {
        $this->apiKey = config('services.deepgram.api_key');
        
        if (empty($this->apiKey)) {
            throw new Exception('Deepgram API key is not configured');
        }
    }

    /**
     * Transcribe audio/video file and generate captions in WebVTT format
     * 
     * @param string $fileUrl URL of the video/audio file
     * @param string $language Language code (en, es, pt, etc.)
     * @param array $options Additional Deepgram options
     * @return array ['success' => bool, 'transcription' => string, 'vtt' => string, 'words' => array, 'data' => array]
     */
    public function transcribeFromUrl(string $fileUrl, string $language = 'en', array $options = []): array
    {
        try {
            // Default options for transcription
            $defaultOptions = [
                'punctuate' => true,
                'diarize' => false,
                'utterances' => true,
                'paragraphs' => true,
                'smart_format' => true,
            ];

            $options = array_merge($defaultOptions, $options);

            // Build query parameters
            $queryParams = http_build_query([
                'language' => $language,
                'punctuate' => $options['punctuate'] ? 'true' : 'false',
                'diarize' => $options['diarize'] ? 'true' : 'false',
                'utterances' => $options['utterances'] ? 'true' : 'false',
                'paragraphs' => $options['paragraphs'] ? 'true' : 'false',
                'smart_format' => $options['smart_format'] ? 'true' : 'false',
                'model' => $options['model'] ?? 'nova-2',
            ]);

            $url = "{$this->baseUrl}/listen?{$queryParams}";

            Log::info('Deepgram transcription started', [
                'url' => $fileUrl,
                'language' => $language,
            ]);

            // Send request to Deepgram
            $response = Http::timeout(600) // 10 minutes timeout
                ->withHeaders([
                    'Authorization' => "Token {$this->apiKey}",
                    'Content-Type' => 'application/json',
                ])
                ->post($url, [
                    'url' => $fileUrl,
                ]);

            if (!$response->successful()) {
                Log::error('Deepgram transcription failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'url' => $fileUrl,
                ]);

                return [
                    'success' => false,
                    'transcription' => null,
                    'vtt' => null,
                    'words' => [],
                    'data' => null,
                    'error' => 'Deepgram API error: ' . $response->body(),
                ];
            }

            $data = $response->json();

            // Extract transcription text
            $transcription = $this->extractTranscription($data);

            // Extract word-level timestamps
            $words = $this->extractWords($data);

            // Generate WebVTT caption file
            $vtt = $this->generateWebVTT($data, $language);

            Log::info('Deepgram transcription completed', [
                'url' => $fileUrl,
                'language' => $language,
                'words_count' => count($words),
            ]);

            return [
                'success' => true,
                'transcription' => $transcription,
                'vtt' => $vtt,
                'words' => $words,
                'data' => $data,
            ];

        } catch (Exception $e) {
            Log::error('Deepgram transcription exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'url' => $fileUrl,
            ]);

            return [
                'success' => false,
                'transcription' => null,
                'vtt' => null,
                'words' => [],
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Transcribe from a local file
     * 
     * @param string $filePath Path to the local file
     * @param string $language Language code
     * @param array $options Additional options
     * @return array
     */
    public function transcribeFromFile(string $filePath, string $language = 'en', array $options = []): array
    {
        try {
            // Read file content
            $fileContent = file_get_contents($filePath);
            
            if ($fileContent === false) {
                throw new Exception("Could not read file: {$filePath}");
            }

            // Detect mime type
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $filePath);
            finfo_close($finfo);

            // Default options
            $defaultOptions = [
                'punctuate' => true,
                'diarize' => false,
                'utterances' => true,
                'paragraphs' => true,
                'smart_format' => true,
            ];

            $options = array_merge($defaultOptions, $options);

            // Build query parameters
            $queryParams = http_build_query([
                'language' => $language,
                'punctuate' => $options['punctuate'] ? 'true' : 'false',
                'diarize' => $options['diarize'] ? 'true' : 'false',
                'utterances' => $options['utterances'] ? 'true' : 'false',
                'paragraphs' => $options['paragraphs'] ? 'true' : 'false',
                'smart_format' => $options['smart_format'] ? 'true' : 'false',
                'model' => $options['model'] ?? 'nova-2',
            ]);

            $url = "{$this->baseUrl}/listen?{$queryParams}";

            Log::info('Deepgram transcription from file started', [
                'file' => $filePath,
                'language' => $language,
                'mime_type' => $mimeType,
            ]);

            // Send request with file content
            $response = Http::timeout(600)
                ->withHeaders([
                    'Authorization' => "Token {$this->apiKey}",
                    'Content-Type' => $mimeType,
                ])
                ->withBody($fileContent, $mimeType)
                ->post($url);

            if (!$response->successful()) {
                Log::error('Deepgram transcription from file failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'transcription' => null,
                    'vtt' => null,
                    'words' => [],
                    'data' => null,
                    'error' => 'Deepgram API error: ' . $response->body(),
                ];
            }

            $data = $response->json();

            // Extract data
            $transcription = $this->extractTranscription($data);
            $words = $this->extractWords($data);
            $vtt = $this->generateWebVTT($data, $language);

            Log::info('Deepgram transcription from file completed', [
                'file' => $filePath,
                'language' => $language,
                'words_count' => count($words),
            ]);

            return [
                'success' => true,
                'transcription' => $transcription,
                'vtt' => $vtt,
                'words' => $words,
                'data' => $data,
            ];

        } catch (Exception $e) {
            Log::error('Deepgram transcription from file exception', [
                'error' => $e->getMessage(),
                'file' => $filePath,
            ]);

            return [
                'success' => false,
                'transcription' => null,
                'vtt' => null,
                'words' => [],
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extract full transcription text from Deepgram response
     */
    protected function extractTranscription(array $data): string
    {
        $transcription = '';

        // Try to get full transcript from paragraphs (preferred)
        if (isset($data['results']['channels'][0]['alternatives'][0]['paragraphs']['transcript'])) {
            $transcription = $data['results']['channels'][0]['alternatives'][0]['paragraphs']['transcript'];
            Log::debug('Extracted transcription from paragraphs.transcript', [
                'length' => strlen($transcription),
                'preview' => substr($transcription, 0, 100),
            ]);
        } 
        // Fallback to alternatives transcript
        elseif (isset($data['results']['channels'][0]['alternatives'][0]['transcript'])) {
            $transcription = $data['results']['channels'][0]['alternatives'][0]['transcript'];
            Log::debug('Extracted transcription from alternatives.transcript', [
                'length' => strlen($transcription),
                'preview' => substr($transcription, 0, 100),
            ]);
        }
        // Final fallback: concatenate words manually
        elseif (isset($data['results']['channels'][0]['alternatives'][0]['words'])) {
            $words = $data['results']['channels'][0]['alternatives'][0]['words'];
            $wordTexts = array_map(function($word) {
                return $word['punctuated_word'] ?? $word['word'] ?? '';
            }, $words);
            $transcription = implode(' ', $wordTexts);
            Log::warning('Had to manually concatenate words for transcription', [
                'word_count' => count($words),
                'length' => strlen($transcription),
            ]);
        }

        // Ensure we return a string, not an array
        if (is_array($transcription)) {
            Log::error('extractTranscription returned an array instead of string!', [
                'type' => gettype($transcription),
                'array_count' => count($transcription),
            ]);
            $transcription = '';
        }

        $result = trim($transcription);
        
        Log::debug('Final extracted transcription', [
            'type' => gettype($result),
            'length' => strlen($result),
            'is_string' => is_string($result),
        ]);

        return $result;
    }

    /**
     * Extract word-level timestamps from Deepgram response
     */
    protected function extractWords(array $data): array
    {
        $words = [];

        if (isset($data['results']['channels'][0]['alternatives'][0]['words'])) {
            $words = $data['results']['channels'][0]['alternatives'][0]['words'];
        }

        return $words;
    }

    /**
     * Generate WebVTT caption file from Deepgram response
     * Groups words into caption segments (approximately 5-7 seconds each)
     */
    protected function generateWebVTT(array $data, string $language = 'en'): string
    {
        $words = $this->extractWords($data);

        if (empty($words)) {
            return "WEBVTT\n\n";
        }

        $vtt = "WEBVTT\n";
        $vtt .= "Language: {$language}\n\n";

        $currentSegment = [];
        $segmentStart = null;
        $segmentEnd = null;
        $maxSegmentDuration = 7.0; // seconds
        $maxWordsPerSegment = 15;
        $segmentNumber = 1;

        foreach ($words as $index => $word) {
            $wordStart = $word['start'] ?? 0;
            $wordEnd = $word['end'] ?? 0;
            $wordText = $word['word'] ?? $word['punctuated_word'] ?? '';

            // Initialize segment
            if ($segmentStart === null) {
                $segmentStart = $wordStart;
            }

            // Add word to current segment
            $currentSegment[] = $wordText;
            $segmentEnd = $wordEnd;

            // Check if we should end the current segment
            $segmentDuration = $segmentEnd - $segmentStart;
            $wordCount = count($currentSegment);
            $isLastWord = $index === count($words) - 1;

            if ($segmentDuration >= $maxSegmentDuration || $wordCount >= $maxWordsPerSegment || $isLastWord) {
                // Write segment to VTT
                $vtt .= "{$segmentNumber}\n";
                $vtt .= $this->formatTimestamp($segmentStart) . " --> " . $this->formatTimestamp($segmentEnd) . "\n";
                $vtt .= implode(' ', $currentSegment) . "\n\n";

                // Reset for next segment
                $currentSegment = [];
                $segmentStart = null;
                $segmentNumber++;
            }
        }

        return $vtt;
    }

    /**
     * Format timestamp for WebVTT (HH:MM:SS.mmm)
     */
    protected function formatTimestamp(float $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;

        return sprintf('%02d:%02d:%06.3f', $hours, $minutes, $secs);
    }

    /**
     * Translate transcription text using GoogleTranslateService
     * Falls back to original text if translation fails
     * 
     * @param string $text Text to translate
     * @param string $targetLanguage Target language code
     * @param string $sourceLanguage Source language code
     * @return array ['success' => bool, 'translated_text' => string]
     */
    public function translateText(string $text, string $targetLanguage, string $sourceLanguage = 'en'): array
    {
        // If source and target are the same, return original
        if ($sourceLanguage === $targetLanguage) {
            return [
                'success' => true,
                'translated_text' => $text,
            ];
        }

        try {
            $translateService = app(GoogleTranslateService::class);
            $translatedText = $translateService->translate($text, $targetLanguage, $sourceLanguage);

            // If translation returns empty, use original
            if (empty(trim($translatedText))) {
                Log::warning('Translation returned empty, using original text', [
                    'target' => $targetLanguage,
                ]);
                $translatedText = $text;
            }

            return [
                'success' => true,
                'translated_text' => $translatedText,
            ];

        } catch (Exception $e) {
            Log::warning('Translation failed, using original text as fallback', [
                'error' => $e->getMessage(),
                'source' => $sourceLanguage,
                'target' => $targetLanguage,
            ]);

            // Return original text as fallback (don't fail the entire process)
            return [
                'success' => true, // Changed to true so process continues
                'translated_text' => $text, // Use original text
                'error' => $e->getMessage(),
                'fallback_used' => true,
            ];
        }
    }

    /**
     * Translate WebVTT caption file to another language
     * Preserves timing and formatting, only translates text
     * Falls back to original if translation fails
     * 
     * @param string $vttContent Original VTT content
     * @param string $targetLanguage Target language code
     * @param string $sourceLanguage Source language code
     * @return string Translated VTT content
     */
    public function translateWebVTT(string $vttContent, string $targetLanguage, string $sourceLanguage = 'en'): string
    {
        // If source and target are the same, just update language header
        if ($sourceLanguage === $targetLanguage) {
            return str_replace(
                "Language: {$sourceLanguage}",
                "Language: {$targetLanguage}",
                $vttContent
            );
        }

        try {
            $translateService = app(GoogleTranslateService::class);
            
            // Parse VTT and extract text segments
            $lines = explode("\n", $vttContent);
            $translatedLines = [];
            
            foreach ($lines as $line) {
                $trimmedLine = trim($line);
                
                // Skip empty lines, WEBVTT header, cue identifiers, and timestamps
                if (empty($trimmedLine) || 
                    str_starts_with($trimmedLine, 'WEBVTT') || 
                    str_contains($trimmedLine, '-->') ||
                    preg_match('/^Language:/i', $trimmedLine) ||
                    preg_match('/^\d+$/', $trimmedLine)) {
                    
                    // Update language in header if present
                    if (str_starts_with($trimmedLine, 'Language:')) {
                        $translatedLines[] = "Language: {$targetLanguage}";
                    } else {
                        $translatedLines[] = $line;
                    }
                } else {
                    // This is caption text - translate it
                    try {
                        $translated = $translateService->translate($trimmedLine, $targetLanguage, $sourceLanguage);
                        // Use original if translation is empty
                        $translatedLines[] = !empty(trim($translated)) ? $translated : $trimmedLine;
                    } catch (Exception $lineError) {
                        // If individual line fails, use original
                        $translatedLines[] = $trimmedLine;
                    }
                }
            }
            
            return implode("\n", $translatedLines);

        } catch (Exception $e) {
            Log::warning('WebVTT translation failed, using original with language header update', [
                'error' => $e->getMessage(),
                'target' => $targetLanguage,
            ]);

            // Return original with updated language header
            return str_replace(
                "Language: {$sourceLanguage}",
                "Language: {$targetLanguage}",
                $vttContent
            );
        }
    }

    /**
     * Generate audio from text using Deepgram TTS
     * 
     * @param string $text Text to convert to speech
     * @param string $language Language code (en, es, pt)
     * @param string $model TTS model to use (optional)
     * @return array ['success' => bool, 'audio_content' => string, 'audio_url' => string]
     */
    public function textToSpeech(string $text, string $language = 'en', ?string $model = null): array
    {
        try {
            // Map language to Deepgram TTS models
            $models = [
                'en' => 'aura-asteria-en',    // English female
                'es' => 'aura-luna-es',        // Spanish female
                'pt' => 'aura-orpheus-en',     // Multilingual (supports Portuguese)
            ];

            $selectedModel = $model ?? ($models[$language] ?? $models['en']);

            $url = "{$this->baseUrl}/speak?model={$selectedModel}";

            Log::info('Deepgram TTS request', [
                'language' => $language,
                'model' => $selectedModel,
                'text_length' => strlen($text),
            ]);

            $response = Http::timeout(300) // 5 minutes for long texts
                ->withHeaders([
                    'Authorization' => "Token {$this->apiKey}",
                    'Content-Type' => 'application/json',
                ])
                ->post($url, [
                    'text' => $text,
                ]);

            if (!$response->successful()) {
                Log::error('Deepgram TTS failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => 'Deepgram TTS error: ' . $response->body(),
                ];
            }

            $audioContent = $response->body();

            // Save audio file to storage
            $filename = 'tts/' . uniqid() . '-' . $language . '.mp3';
            Storage::put('public/' . $filename, $audioContent);

            $audioPath = storage_path('app/public/' . $filename);
            $audioUrl = asset('storage/' . $filename);

            Log::info('Deepgram TTS completed', [
                'language' => $language,
                'file_size' => strlen($audioContent),
                'path' => $audioPath,
            ]);

            return [
                'success' => true,
                'audio_content' => $audioContent,
                'audio_path' => $audioPath,
                'audio_url' => $audioUrl,
                'filename' => $filename,
            ];

        } catch (Exception $e) {
            Log::error('Deepgram TTS exception', [
                'error' => $e->getMessage(),
                'language' => $language,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Process a video and generate transcriptions for multiple languages
     * 
     * @param string $videoUrl URL of the video
     * @param array $languages Array of language codes ['en', 'es', 'pt']
     * @param string $sourceLanguage Source language of the video
     * @return array
     */
    public function processVideoMultiLanguage(string $videoUrl, array $languages = ['en', 'es', 'pt'], string $sourceLanguage = 'en'): array
    {
        $results = [];

        try {
            // First, transcribe in the source language
            $sourceResult = $this->transcribeFromUrl($videoUrl, $sourceLanguage);

            if (!$sourceResult['success']) {
                return [
                    'success' => false,
                    'error' => 'Failed to transcribe source language: ' . ($sourceResult['error'] ?? 'Unknown error'),
                    'results' => [],
                ];
            }

            $results[$sourceLanguage] = $sourceResult;

            // Now transcribe/translate for other languages
            // Deepgram supports multi-language detection, so we can transcribe each language
            foreach ($languages as $language) {
                if ($language === $sourceLanguage) {
                    continue; // Already done
                }

                // For translation, we'll need to use a translation service
                // For now, just transcribe the audio assuming it might have that language
                // In production, you'd translate the transcription or use multi-language audio if available
                
                Log::info("Processing language: {$language}");
                
                // Option 1: Use translation service on transcription
                // This requires GoogleTranslateService or similar
                
                // Option 2: Deepgram can try to transcribe in target language
                // (useful if you'll later replace audio with TTS)
                $langResult = $this->transcribeFromUrl($videoUrl, $language);
                
                if ($langResult['success']) {
                    $results[$language] = $langResult;
                } else {
                    Log::warning("Failed to process language {$language}: " . ($langResult['error'] ?? 'Unknown'));
                }
            }

            return [
                'success' => true,
                'results' => $results,
                'source_language' => $sourceLanguage,
            ];

        } catch (Exception $e) {
            Log::error('Multi-language processing exception', [
                'error' => $e->getMessage(),
                'video_url' => $videoUrl,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'results' => $results,
            ];
        }
    }
}

