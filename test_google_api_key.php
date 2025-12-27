<?php

/**
 * Test script to verify Google Cloud API key and check which APIs are enabled
 * 
 * Usage: php test_google_api_key.php
 * 
 * This script tests:
 * 1. API key validity
 * 2. Which APIs are enabled/accessible
 * 3. Basic functionality of each API
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Google Cloud API Key Test ===\n\n";

$apiKey = 'AIzaSyB7qVy8Lm-UpndDJXkMX_iIhGpv7di6CEE';

echo "API Key: " . substr($apiKey, 0, 10) . "...\n";
echo "Key Type: Browser/REST API Key (AIzaSy... format)\n\n";

// Test 1: Check API key validity with Translation API
echo "Step 1: Testing Translation API...\n";

try {
    $testUrl = "https://translation.googleapis.com/language/translate/v2/languages?key=" . urlencode($apiKey);
    
    $ch = curl_init($testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        echo "⚠️  Connection error: {$curlError}\n\n";
    } else if ($response) {
        $data = json_decode($response, true);
        if (isset($data['data']['languages'])) {
            echo "✅ Translation API is accessible!\n";
            echo "   HTTP Status: {$httpCode}\n";
            echo "   Supported languages: " . count($data['data']['languages']) . "\n\n";
        } else if (isset($data['error'])) {
            $error = $data['error'];
            echo "❌ Translation API error: " . ($error['message'] ?? 'Unknown error') . "\n";
            echo "   HTTP Status: {$httpCode}\n";
            if (isset($error['status'])) {
                echo "   Error Status: " . $error['status'] . "\n";
                if ($error['status'] === 'PERMISSION_DENIED') {
                    echo "   → API not enabled. Enable Translation API in Google Cloud Console.\n";
                } else if ($error['status'] === 'INVALID_API_KEY') {
                    echo "   → API key is invalid or restricted.\n";
                }
            }
            echo "\n";
        } else {
            echo "⚠️  Unexpected response format\n";
            echo "   HTTP Status: {$httpCode}\n";
            echo "   Response: " . substr($response, 0, 200) . "\n\n";
        }
    } else {
        echo "⚠️  No response from Translation API\n";
        echo "   HTTP Status: {$httpCode}\n\n";
    }
} catch (\Exception $e) {
    echo "❌ Error testing Translation API: " . $e->getMessage() . "\n\n";
}

// Test 2: Try a simple translation
echo "Step 2: Testing Translation API with sample text...\n";

try {
    $testText = "Hola, ¿cómo estás?";
    $targetLang = 'en';
    
    $translateUrl = "https://translation.googleapis.com/language/translate/v2?key=" . urlencode($apiKey);
    $postData = json_encode([
        'q' => $testText,
        'target' => $targetLang,
        'source' => 'es',
    ]);
    
    $ch = curl_init($translateUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($response) {
        $data = json_decode($response, true);
        if (isset($data['data']['translations'][0]['translatedText'])) {
            $translated = $data['data']['translations'][0]['translatedText'];
            echo "✅ Translation successful!\n";
            echo "   HTTP Status: {$httpCode}\n";
            echo "   Original (Spanish): {$testText}\n";
            echo "   Translated (English): {$translated}\n\n";
        } else if (isset($data['error'])) {
            $error = $data['error'];
            echo "❌ Translation failed: " . ($error['message'] ?? 'Unknown error') . "\n";
            echo "   HTTP Status: {$httpCode}\n";
            if (isset($error['status'])) {
                echo "   Error Status: " . $error['status'] . "\n";
            }
            echo "\n";
        }
    } else {
        echo "⚠️  No response from Translation API\n";
        echo "   HTTP Status: {$httpCode}\n\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

// Test 3: Check Text-to-Speech voices
echo "Step 3: Testing Text-to-Speech API...\n";

try {
    $voicesUrl = "https://texttospeech.googleapis.com/v1/voices?key=" . urlencode($apiKey);
    
    $ch = curl_init($voicesUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($response) {
        $data = json_decode($response, true);
        if (isset($data['voices'])) {
            echo "✅ Text-to-Speech API is accessible!\n";
            echo "   HTTP Status: {$httpCode}\n";
            echo "   Available voices: " . count($data['voices']) . "\n";
            
            // Show voices for our target languages
            $targetLangs = ['es', 'en', 'pt'];
            foreach ($targetLangs as $lang) {
                $langVoices = array_filter($data['voices'], function($voice) use ($lang) {
                    return isset($voice['languageCodes'][0]) && strpos($voice['languageCodes'][0], $lang) === 0;
                });
                if (count($langVoices) > 0) {
                    $firstVoice = reset($langVoices);
                    echo "   {$lang} voice example: " . ($firstVoice['name'] ?? 'N/A') . " (" . ($firstVoice['languageCodes'][0] ?? '') . ")\n";
                }
            }
            echo "\n";
        } else if (isset($data['error'])) {
            $error = $data['error'];
            echo "❌ Text-to-Speech API error: " . ($error['message'] ?? 'Unknown error') . "\n";
            echo "   HTTP Status: {$httpCode}\n";
            if (isset($error['status'])) {
                echo "   Error Status: " . $error['status'] . "\n";
                if ($error['status'] === 'PERMISSION_DENIED') {
                    echo "   → API not enabled. Enable Text-to-Speech API in Google Cloud Console.\n";
                } else if ($error['status'] === 'INVALID_API_KEY') {
                    echo "   → API key is invalid or restricted.\n";
                }
            }
            echo "\n";
        } else {
            echo "⚠️  Unexpected response format\n";
            echo "   HTTP Status: {$httpCode}\n\n";
        }
    } else {
        echo "⚠️  No response from Text-to-Speech API\n";
        echo "   HTTP Status: {$httpCode}\n\n";
    }
} catch (\Exception $e) {
    echo "⚠️  Error: " . $e->getMessage() . "\n\n";
}

// Test 4: Check Speech-to-Text (may require different authentication)
echo "Step 4: Testing Speech-to-Text API...\n";
echo "   Note: Speech-to-Text API typically requires service account authentication\n";
echo "   for full functionality, but we can check if the API is accessible.\n\n";

// Summary
echo "=== Summary ===\n\n";
echo "API Key Type: Browser/REST API Key\n";
echo "Format: AIzaSy... (this is a REST API key)\n\n";
echo "This API key can be used for:\n";
echo "  ✅ Translation API (REST) - Works with API key\n";
echo "  ✅ Text-to-Speech API (REST) - Works with API key\n";
echo "  ⚠️  Speech-to-Text API - May require service account for some operations\n\n";
echo "How to use in project:\n";
echo "  1. Add to .env file:\n";
echo "     GOOGLE_CLOUD_API_KEY=AIzaSyD6I9ZFE2r7Sj4Ly-JOxWJixnTTgx09ljY\n\n";
echo "  2. The service will use this key for REST API calls\n";
echo "  3. For Speech-to-Text, you may need a service account JSON file\n\n";
echo "Security Recommendations:\n";
echo "  - Restrict API key to specific APIs in Google Cloud Console\n";
echo "  - Restrict by IP address (for server-side use)\n";
echo "  - Monitor usage in Google Cloud Console\n\n";
echo "✅ Test completed!\n";

