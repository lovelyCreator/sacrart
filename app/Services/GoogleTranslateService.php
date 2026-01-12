<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class GoogleTranslateService
{
    private ?string $apiKey;

    public function __construct()
    {
        $this->apiKey = env('GOOGLE_TRANSLATE_API_KEY');
        
        // Log API key status (without exposing the actual key)
        if (empty($this->apiKey)) {
            Log::warning('Google Translate API key is not set in environment');
        } else {
            Log::info('Google Translate API key is configured', [
                'key_length' => strlen($this->apiKey),
                'key_prefix' => substr($this->apiKey, 0, 10) . '...',
            ]);
        }
    }

    /**
     * Translate text from source language to target language using Google Translate API v2
     * 
     * @param string $text The text to translate
     * @param string $targetLanguage Target language code (es, pt)
     * @param string $sourceLanguage Source language code (default: en)
     * @return string Translated text
     */
    public function translate(string $text, string $targetLanguage, string $sourceLanguage = 'en'): string
    {
        try {
            // If source and target are the same, return original text
            if ($sourceLanguage === $targetLanguage) {
                return $text;
            }

            // If text is empty, return empty string
            if (empty(trim($text))) {
                return $text;
            }

            // If API key is not set, return original text
            if (empty($this->apiKey)) {
                Log::error('Google Translate API key not configured - check GOOGLE_TRANSLATE_API_KEY in .env');
                return $text;
            }
            
            Log::info('Google Translate API call', [
                'source' => $sourceLanguage,
                'target' => $targetLanguage,
                'text_length' => strlen($text),
                'has_api_key' => !empty($this->apiKey),
            ]);

            // Use Google Translate API v2 REST API
            $url = "https://translation.googleapis.com/language/translate/v2?key=" . urlencode($this->apiKey);
            
            $postData = json_encode([
                'q' => $text,
                'target' => $targetLanguage,
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
                $errorCode = $errorData['error']['code'] ?? $httpCode;
                
                Log::error('Google Translate API HTTP error', [
                    'http_code' => $httpCode,
                    'error_code' => $errorCode,
                    'error_message' => $errorMsg,
                    'full_response' => $response,
                    'source' => $sourceLanguage,
                    'target' => $targetLanguage,
                ]);
                
                throw new \Exception("Translation API error ({$errorCode}): {$errorMsg}");
            }

            $data = json_decode($response, true);
            
            if (isset($data['data']['translations'][0]['translatedText'])) {
                $translatedText = $data['data']['translations'][0]['translatedText'];
                Log::info('Google Translate success', [
                    'source' => $sourceLanguage,
                    'target' => $targetLanguage,
                    'original' => substr($text, 0, 50),
                    'translated' => substr($translatedText, 0, 50),
                ]);
                return $translatedText;
            }
            
            // Log unexpected response structure
            Log::warning('Google Translate unexpected response structure', [
                'response' => $response,
                'data' => $data,
                'text' => substr($text, 0, 100),
                'source' => $sourceLanguage,
                'target' => $targetLanguage,
            ]);
            
            return $text; // Return original if translation structure is unexpected
        } catch (\Exception $e) {
            Log::error('Google Translate error: ' . $e->getMessage(), [
                'text' => substr($text, 0, 100),
                'source' => $sourceLanguage,
                'target' => $targetLanguage,
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Return original text on error
            return $text;
        }
    }

    /**
     * Translate text to multiple languages
     * 
     * @param string $text The text to translate
     * @param array $targetLanguages Array of target language codes ['es', 'pt']
     * @param string $sourceLanguage Source language code (default: en)
     * @return array Associative array with language codes as keys ['es' => 'translated text', 'pt' => 'translated text']
     */
    public function translateToMultiple(string $text, array $targetLanguages = ['es', 'pt'], string $sourceLanguage = 'en'): array
    {
        $translations = [];

        foreach ($targetLanguages as $lang) {
            if ($lang !== $sourceLanguage) {
                $translations[$lang] = $this->translate($text, $lang, $sourceLanguage);
            } else {
                $translations[$lang] = $text;
            }
        }

        return $translations;
    }

    /**
     * Translate multiple fields at once
     * 
     * @param array $fields Associative array of field names and values ['title' => 'Hello', 'description' => 'World']
     * @param array $targetLanguages Array of target language codes ['es', 'pt']
     * @param string $sourceLanguage Source language code (default: en)
     * @return array Nested array with field names and language codes ['title' => ['es' => '...', 'pt' => '...'], ...]
     */
    public function translateFields(array $fields, array $targetLanguages = ['es', 'pt'], string $sourceLanguage = 'en'): array
    {
        $result = [];

        foreach ($fields as $fieldName => $fieldValue) {
            if (!empty(trim($fieldValue))) {
                $result[$fieldName] = $this->translateToMultiple($fieldValue, $targetLanguages, $sourceLanguage);
            } else {
                // If field is empty, set empty translations
                $result[$fieldName] = array_fill_keys($targetLanguages, '');
            }
        }

        return $result;
    }
}
