<?php

namespace App\Services;

// Google Cloud API clients - will be initialized lazily
// Note: Import statements will be added when packages are installed
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GoogleCloudAudioService
{
    protected $projectId;
    protected $credentialsPath;
    protected $apiKey; // For REST API authentication
    protected $speechClient;
    protected $translateClient;
    protected $ttsClient;

    public function __construct()
    {
        $this->projectId = config('services.google_cloud.project_id');
        $this->credentialsPath = config('services.google_cloud.credentials_path');
        $this->apiKey = config('services.google_cloud.api_key') ?: env('GOOGLE_CLOUD_API_KEY');
        
        // Initialize clients lazily (only when needed)
    }

    /**
     * Initialize Speech-to-Text client
     * Note: Requires google/cloud-speech package
     */
    protected function getSpeechClient()
    {
        if (!$this->speechClient) {
            if ($this->credentialsPath) {
                putenv('GOOGLE_APPLICATION_CREDENTIALS=' . base_path($this->credentialsPath));
            }
            // Initialize Speech client
            // $this->speechClient = new \Google\Cloud\Speech\V1\SpeechClient();
            // Note: Actual implementation depends on installed package version
            throw new \Exception('Google Cloud Speech-to-Text client not initialized. Please install google/cloud-speech package.');
        }
        return $this->speechClient;
    }

    /**
     * Initialize Translation client
     * Note: Requires google/cloud-translate package
     */
    protected function getTranslateClient()
    {
        if (!$this->translateClient) {
            $config = [];
            if ($this->credentialsPath) {
                $config['keyFilePath'] = base_path($this->credentialsPath);
            }
            // Initialize Translation client
            // $this->translateClient = new \Google\Cloud\Translate\V2\TranslateClient($config);
            // Note: Actual implementation depends on installed package version
            throw new \Exception('Google Cloud Translation client not initialized. Please install google/cloud-translate package.');
        }
        return $this->translateClient;
    }

    /**
     * Initialize Text-to-Speech client
     * Note: Requires google/cloud-text-to-speech package
     */
    protected function getTtsClient()
    {
        if (!$this->ttsClient) {
            if ($this->credentialsPath) {
                putenv('GOOGLE_APPLICATION_CREDENTIALS=' . base_path($this->credentialsPath));
            }
            // Initialize TTS client
            // $this->ttsClient = new \Google\Cloud\TextToSpeech\V1\TextToSpeechClient();
            // Note: Actual implementation depends on installed package version
            throw new \Exception('Google Cloud Text-to-Speech client not initialized. Please install google/cloud-text-to-speech package.');
        }
        return $this->ttsClient;
    }

    /**
     * Extract audio from video file using FFMpeg
     * 
     * @param string $videoPath Full path to video file
     * @return string Path to extracted audio file
     */
    public function extractAudioFromVideo(string $videoPath): string
    {
        try {
            $outputPath = storage_path('app/temp/audio_' . uniqid() . '.wav');
            
            // Ensure temp directory exists
            $tempDir = dirname($outputPath);
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            // Use FFMpeg to extract audio
            $ffmpeg = \FFMpeg\FFMpeg::create([
                'ffmpeg.binaries' => env('FFMPEG_BINARY', 'ffmpeg'),
                'ffprobe.binaries' => env('FFPROBE_BINARY', 'ffprobe'),
            ]);

            $video = $ffmpeg->open($videoPath);
            $audioFormat = new \FFMpeg\Format\Audio\Wav();
            
            // Extract audio track
            $video->save($audioFormat, $outputPath);

            Log::info('Audio extracted from video', [
                'video_path' => $videoPath,
                'audio_path' => $outputPath,
            ]);

            return $outputPath;

        } catch (\Exception $e) {
            Log::error('Failed to extract audio from video', [
                'video_path' => $videoPath,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Detect language and transcribe audio using Speech-to-Text REST API
     * 
     * @param string $audioPath Path to audio file
     * @param string|null $expectedLanguage Optional: expected language code (e.g., 'es', 'en', 'pt')
     * @return array ['language' => string, 'text' => string, 'confidence' => float, 'alternatives' => array]
     */
    public function detectAndTranscribe(string $audioPath, ?string $expectedLanguage = null): array
    {
        try {
            if (empty($this->apiKey)) {
                throw new \Exception('Google Cloud API key is not configured. Set GOOGLE_CLOUD_API_KEY in .env file.');
            }

            if (!file_exists($audioPath)) {
                throw new \Exception("Audio file not found: {$audioPath}");
            }

            // Read and encode audio file
            $audioContent = file_get_contents($audioPath);
            $audioBase64 = base64_encode($audioContent);

            // Use REST API for speech-to-text
            $url = "https://speech.googleapis.com/v1/speech:recognize?key=" . urlencode($this->apiKey);
            
            // Configure recognition
            $config = [
                'encoding' => 'LINEAR16', // WAV format
                'sampleRateHertz' => 16000, // Adjust based on your audio
                'languageCode' => $expectedLanguage ?: 'es', // Default to Spanish
                'enableAutomaticPunctuation' => true,
                'enableWordTimeOffsets' => true,
            ];

            // If no expected language, enable alternative language hints for auto-detection
            if (!$expectedLanguage) {
                $config['alternativeLanguageCodes'] = ['es', 'en', 'pt'];
            }

            $requestData = [
                'config' => $config,
                'audio' => [
                    'content' => $audioBase64,
                ],
            ];

            $postData = json_encode($requestData);

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                throw new \Exception("Speech-to-Text API request failed: {$curlError}");
            }

            if ($httpCode !== 200) {
                $errorData = json_decode($response, true);
                $errorMsg = $errorData['error']['message'] ?? "HTTP {$httpCode}";
                throw new \Exception("Speech-to-Text API error: {$errorMsg}");
            }

            $data = json_decode($response, true);
            
            if (empty($data['results'])) {
                throw new \Exception('No transcription results returned from Speech-to-Text API');
            }

            // Get best result
            $result = $data['results'][0];
            $alternatives = $result['alternatives'] ?? [];
            $bestAlternative = $alternatives[0] ?? null;

            if (!$bestAlternative) {
                throw new \Exception('No transcription alternatives found');
            }

            $transcription = [
                'language' => $expectedLanguage ?: 'es', // API doesn't return detected language in this format
                'text' => $bestAlternative['transcript'] ?? '',
                'confidence' => $bestAlternative['confidence'] ?? 0.0,
                'alternatives' => [],
            ];

            // Get alternative transcriptions
            foreach ($alternatives as $index => $alt) {
                if ($index > 0) {
                    $transcription['alternatives'][] = [
                        'text' => $alt['transcript'] ?? '',
                        'confidence' => $alt['confidence'] ?? 0.0,
                    ];
                }
            }

            Log::info('Audio transcribed successfully', [
                'detected_language' => $transcription['language'],
                'confidence' => $transcription['confidence'],
                'text_length' => strlen($transcription['text']),
            ]);

            return $transcription;

        } catch (\Exception $e) {
            Log::error('Failed to transcribe audio', [
                'audio_path' => $audioPath,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Translate text to target languages using REST API
     * 
     * @param string $text Text to translate
     * @param string $sourceLanguage Source language code (e.g., 'es')
     * @param array $targetLanguages Target language codes (e.g., ['en', 'pt'])
     * @return array ['en' => 'English text', 'pt' => 'Portuguese text']
     */
    public function translateText(string $text, string $sourceLanguage, array $targetLanguages): array
    {
        try {
            if (empty($this->apiKey)) {
                throw new \Exception('Google Cloud API key is not configured. Set GOOGLE_CLOUD_API_KEY in .env file.');
            }

            $translations = [];

            foreach ($targetLanguages as $targetLang) {
                // Skip if target language is same as source
                if ($targetLang === $sourceLanguage) {
                    $translations[$targetLang] = $text;
                    continue;
                }

                // Use REST API for translation
                $url = "https://translation.googleapis.com/language/translate/v2?key=" . urlencode($this->apiKey);
                
                $postData = json_encode([
                    'q' => $text,
                    'target' => $targetLang,
                    'source' => $sourceLanguage,
                    'format' => 'text',
                ]);

                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);

                if ($curlError) {
                    throw new \Exception("Translation API request failed: {$curlError}");
                }

                if ($httpCode !== 200) {
                    $errorData = json_decode($response, true);
                    $errorMsg = $errorData['error']['message'] ?? "HTTP {$httpCode}";
                    throw new \Exception("Translation API error: {$errorMsg}");
                }

                $data = json_decode($response, true);
                
                if (isset($data['data']['translations'][0]['translatedText'])) {
                    $translations[$targetLang] = $data['data']['translations'][0]['translatedText'];
                    
                    Log::info('Text translated successfully', [
                        'source' => $sourceLanguage,
                        'target' => $targetLang,
                        'text_length' => strlen($text),
                    ]);
                } else {
                    throw new \Exception('Translation API did not return translated text');
                }
            }

            return $translations;

        } catch (\Exception $e) {
            Log::error('Failed to translate text', [
                'source_language' => $sourceLanguage,
                'target_languages' => $targetLanguages,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Generate audio from text using Text-to-Speech REST API
     * 
     * @param string $text Text to convert to speech
     * @param string $languageCode Language code (e.g., 'es', 'en', 'pt')
     * @param string $voiceName Optional: specific voice name (e.g., 'es-ES-Standard-A')
     * @return string Path to generated audio file
     */
    public function textToSpeech(string $text, string $languageCode, ?string $voiceName = null): string
    {
        try {
            if (empty($this->apiKey)) {
                throw new \Exception('Google Cloud API key is not configured. Set GOOGLE_CLOUD_API_KEY in .env file.');
            }

            // Default voices for each language
            $defaultVoices = [
                'es' => 'es-ES-Standard-A', // Spanish (Spain) - Female
                'en' => 'en-US-Standard-A', // English (US) - Female
                'pt' => 'pt-BR-Standard-A', // Portuguese (Brazil) - Female
            ];

            $selectedVoice = $voiceName ?: ($defaultVoices[$languageCode] ?? $languageCode . '-Standard-A');

            // Use REST API for text-to-speech
            $url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" . urlencode($this->apiKey);
            
            $requestData = [
                'input' => ['text' => $text],
                'voice' => [
                    'languageCode' => $languageCode,
                    'name' => $selectedVoice,
                    'ssmlGender' => 'FEMALE',
                ],
                'audioConfig' => [
                    'audioEncoding' => 'MP3',
                    'sampleRateHertz' => 24000,
                    'speakingRate' => 1.0,
                ],
            ];

            $postData = json_encode($requestData);

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                throw new \Exception("Text-to-Speech API request failed: {$curlError}");
            }

            if ($httpCode !== 200) {
                $errorData = json_decode($response, true);
                $errorMsg = $errorData['error']['message'] ?? "HTTP {$httpCode}";
                throw new \Exception("Text-to-Speech API error: {$errorMsg}");
            }

            $data = json_decode($response, true);
            
            if (!isset($data['audioContent'])) {
                throw new \Exception('Text-to-Speech API did not return audio content');
            }

            // Decode base64 audio content
            $audioContent = base64_decode($data['audioContent']);

            // Save to file
            $outputPath = storage_path('app/temp/tts_' . uniqid() . '_' . $languageCode . '.mp3');
            $tempDir = dirname($outputPath);
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            file_put_contents($outputPath, $audioContent);

            Log::info('Text-to-speech generated successfully', [
                'language' => $languageCode,
                'voice' => $selectedVoice,
                'text_length' => strlen($text),
                'audio_path' => $outputPath,
                'audio_size' => strlen($audioContent),
            ]);

            return $outputPath;

        } catch (\Exception $e) {
            Log::error('Failed to generate text-to-speech', [
                'language' => $languageCode,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Complete workflow: Extract audio, detect language, transcribe, translate, and generate audio tracks
     * 
     * @param string $videoPath Path to video file
     * @param array $targetLanguages Target languages (e.g., ['en', 'pt'])
     * @return array Complete workflow result
     */
    public function processVideoForMultiLanguage(
        string $videoPath,
        array $targetLanguages = ['en', 'pt']
    ): array {
        try {
            Log::info('Starting multi-language audio processing', [
                'video_path' => $videoPath,
                'target_languages' => $targetLanguages,
            ]);

            // Step 1: Extract audio
            $audioPath = $this->extractAudioFromVideo($videoPath);

            // Step 2: Detect language and transcribe
            $transcription = $this->detectAndTranscribe($audioPath);
            $detectedLanguage = $transcription['language'];
            $originalText = $transcription['text'];

            // Step 3: Translate to target languages
            $allLanguages = array_unique(array_merge([$detectedLanguage], $targetLanguages));
            $translations = $this->translateText($originalText, $detectedLanguage, $targetLanguages);

            // Step 4: Generate audio tracks for each language
            $audioTracks = [
                $detectedLanguage => $audioPath, // Original audio
            ];

            foreach ($translations as $lang => $translatedText) {
                if ($lang !== $detectedLanguage) {
                    $audioTracks[$lang] = $this->textToSpeech($translatedText, $lang);
                }
            }

            // Cleanup: Remove temporary audio file
            if (file_exists($audioPath)) {
                @unlink($audioPath);
            }

            return [
                'success' => true,
                'original_language' => $detectedLanguage,
                'transcription' => $originalText,
                'translations' => $translations,
                'audio_tracks' => $audioTracks,
            ];

        } catch (\Exception $e) {
            Log::error('Multi-language audio processing failed', [
                'video_path' => $videoPath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Cleanup temporary files
     */
    public function cleanupTempFiles(array $filePaths): void
    {
        foreach ($filePaths as $path) {
            if (file_exists($path)) {
                @unlink($path);
            }
        }
    }
}

