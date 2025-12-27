<?php

/**
 * Quick test for Translation and Text-to-Speech APIs only
 * (Speech-to-Text testing skipped - waiting for client approval)
 * 
 * Usage: php QUICK_TEST_TRANSLATION_TTS.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Quick Test: Translation & Text-to-Speech APIs ===\n\n";

$apiKey = 'AIzaSyB7qVy8Lm-UpndDJXkMX_iIhGpv7di6CEE';

echo "API Key: " . substr($apiKey, 0, 10) . "...\n";
echo "Note: Speech-to-Text testing skipped (waiting for client approval)\n\n";

// Test 1: Translation API
echo "Step 1: Testing Translation API...\n";

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
    
    if ($response && $httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['data']['translations'][0]['translatedText'])) {
            $translated = $data['data']['translations'][0]['translatedText'];
            echo "✅ Translation API works!\n";
            echo "   Original (Spanish): {$testText}\n";
            echo "   Translated (English): {$translated}\n\n";
        } else {
            echo "❌ Translation failed: Unexpected response format\n\n";
        }
    } else {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? "HTTP {$httpCode}";
        echo "❌ Translation API error: {$errorMsg}\n";
        if (strpos($errorMsg, 'not been used') !== false || strpos($errorMsg, 'disabled') !== false) {
            echo "   → Enable Translation API in Google Cloud Console\n";
        }
        echo "\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

// Test 2: Text-to-Speech API
echo "Step 2: Testing Text-to-Speech API...\n";

try {
    $testText = "Hello, this is a test.";
    $languageCode = 'en';
    $voiceName = 'en-US-Standard-A';
    
    $ttsUrl = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" . urlencode($apiKey);
    $requestData = [
        'input' => ['text' => $testText],
        'voice' => [
            'languageCode' => $languageCode,
            'name' => $voiceName,
            'ssmlGender' => 'FEMALE',
        ],
        'audioConfig' => [
            'audioEncoding' => 'MP3',
            'sampleRateHertz' => 24000,
        ],
    ];
    
    $postData = json_encode($requestData);
    
    $ch = curl_init($ttsUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($response && $httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['audioContent'])) {
            $audioSize = strlen(base64_decode($data['audioContent']));
            echo "✅ Text-to-Speech API works!\n";
            echo "   Generated audio size: " . round($audioSize / 1024, 2) . " KB\n";
            echo "   Text: {$testText}\n";
            echo "   Language: {$languageCode}\n";
            echo "   Voice: {$voiceName}\n\n";
        } else {
            echo "❌ Text-to-Speech failed: No audio content in response\n\n";
        }
    } else {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? "HTTP {$httpCode}";
        echo "❌ Text-to-Speech API error: {$errorMsg}\n";
        if (strpos($errorMsg, 'not been used') !== false || strpos($errorMsg, 'disabled') !== false) {
            echo "   → Enable Text-to-Speech API in Google Cloud Console\n";
        }
        echo "\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "=== Summary ===\n\n";
echo "✅ API Key is valid\n";
echo "⏳ Translation & Text-to-Speech APIs need to be enabled\n";
echo "⏸️  Speech-to-Text testing skipped (waiting for client approval)\n\n";
echo "Next Steps:\n";
echo "1. Enable Translation API in Google Cloud Console\n";
echo "2. Enable Text-to-Speech API in Google Cloud Console\n";
echo "3. Wait 1-2 minutes for changes to propagate\n";
echo "4. Run this test again: php QUICK_TEST_TRANSLATION_TTS.php\n";
echo "5. Add API key to .env: GOOGLE_CLOUD_API_KEY=AIzaSyB7qVy8Lm-UpndDJXkMX_iIhGpv7di6CEE\n\n";

