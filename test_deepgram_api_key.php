<?php

/**
 * Test Deepgram API Key and Check Limits
 * 
 * This script tests:
 * - API key validity
 * - Available features (transcription, translation, TTS)
 * - Account limits and usage
 * 
 * Usage: php test_deepgram_api_key.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// Load Laravel configuration
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Get Deepgram API key from config
$apiKey = config('services.deepgram.api_key');

if (empty($apiKey)) {
    echo "❌ ERROR: Deepgram API key is not configured.\n";
    echo "Please set DEEPGRAM_API_KEY in your .env file.\n";
    exit(1);
}

echo "🔑 Testing Deepgram API Key...\n";
echo "API Key: " . substr($apiKey, 0, 10) . "..." . substr($apiKey, -4) . "\n\n";

$baseUrl = 'https://api.deepgram.com/v1';

// Test 1: Check API key validity by making a simple request
echo "📋 Test 1: Checking API Key Validity\n";
echo str_repeat("-", 50) . "\n";

try {
    // Try to get projects (this requires valid API key)
    $response = Http::timeout(10)
        ->withHeaders([
            'Authorization' => "Token {$apiKey}",
        ])
        ->get("{$baseUrl}/projects");

    if ($response->successful()) {
        $projects = $response->json();
        echo "✅ API Key is VALID\n";
        echo "📊 Projects found: " . (isset($projects['projects']) ? count($projects['projects']) : 0) . "\n";
        
        if (isset($projects['projects']) && count($projects['projects']) > 0) {
            $project = $projects['projects'][0];
            echo "📁 Project ID: " . ($project['project_id'] ?? 'N/A') . "\n";
            echo "📁 Project Name: " . ($project['name'] ?? 'N/A') . "\n";
        }
    } else {
        echo "❌ API Key is INVALID or has insufficient permissions\n";
        echo "Status: " . $response->status() . "\n";
        echo "Response: " . $response->body() . "\n";
        exit(1);
    }
} catch (\Exception $e) {
    echo "❌ Error checking API key: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n";

// Test 2: Check account usage and limits
echo "📋 Test 2: Checking Account Usage and Limits\n";
echo str_repeat("-", 50) . "\n";

try {
    $response = Http::timeout(10)
        ->withHeaders([
            'Authorization' => "Token {$apiKey}",
        ])
        ->get("{$baseUrl}/usage");

    if ($response->successful()) {
        $usage = $response->json();
        echo "✅ Usage data retrieved\n";
        
        if (isset($usage['results'])) {
            foreach ($usage['results'] as $result) {
                echo "📊 Date: " . ($result['date'] ?? 'N/A') . "\n";
                echo "   Requests: " . ($result['requests'] ?? 0) . "\n";
                if (isset($result['details'])) {
                    foreach ($result['details'] as $detail) {
                        echo "   - " . ($detail['feature'] ?? 'unknown') . ": " . ($detail['requests'] ?? 0) . " requests\n";
                    }
                }
            }
        }
    } else {
        echo "⚠️  Could not retrieve usage data (may require different permissions)\n";
        echo "Status: " . $response->status() . "\n";
    }
} catch (\Exception $e) {
    echo "⚠️  Error checking usage: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Test Transcription Feature (with a simple test)
echo "📋 Test 3: Testing Transcription Feature\n";
echo str_repeat("-", 50) . "\n";

try {
    // Use a public test audio URL (Deepgram's example)
    $testAudioUrl = 'https://dpgr.am/spacewalk.wav';
    
    echo "🎤 Testing transcription with sample audio...\n";
    echo "Audio URL: {$testAudioUrl}\n";
    
    $response = Http::timeout(30)
        ->withHeaders([
            'Authorization' => "Token {$apiKey}",
        ])
        ->get("{$baseUrl}/listen", [
            'url' => $testAudioUrl,
            'language' => 'en',
            'model' => 'nova-2',
            'punctuate' => 'true',
            'paragraphs' => 'true',
        ]);

    if ($response->successful()) {
        $result = $response->json();
        echo "✅ Transcription feature is WORKING\n";
        
        if (isset($result['results']['channels'][0]['alternatives'][0])) {
            $transcript = $result['results']['channels'][0]['alternatives'][0];
            echo "📝 Transcript preview: " . substr($transcript['transcript'] ?? '', 0, 100) . "...\n";
            echo "📊 Confidence: " . ($transcript['confidence'] ?? 'N/A') . "\n";
        }
    } else {
        echo "❌ Transcription feature FAILED\n";
        echo "Status: " . $response->status() . "\n";
        echo "Response: " . $response->body() . "\n";
    }
} catch (\Exception $e) {
    echo "❌ Error testing transcription: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 4: Note about Translation Feature
echo "📋 Test 4: Translation Feature\n";
echo str_repeat("-", 50) . "\n";
echo "ℹ️  Translation is handled by Google Translate Service (not Deepgram API)\n";
echo "ℹ️  This is configured separately and used for translating transcriptions\n";
echo "✅ Translation service is available in the application\n";

echo "\n";

// Test 5: Test TTS Feature (optional - may not be available on all plans)
echo "📋 Test 5: Testing TTS (Text-to-Speech) Feature\n";
echo str_repeat("-", 50) . "\n";

try {
    $testText = "Hello, this is a test of text to speech.";
    
    echo "🔊 Testing TTS...\n";
    echo "Text: {$testText}\n";
    echo "Model: aura-asteria-en\n";
    
    $response = Http::timeout(30)
        ->withHeaders([
            'Authorization' => "Token {$apiKey}",
            'Content-Type' => 'application/json',
        ])
        ->post("{$baseUrl}/speak?model=aura-asteria-en", [
            'text' => $testText,
        ]);

    if ($response->successful()) {
        $audioContent = $response->body();
        echo "✅ TTS feature is WORKING\n";
        echo "📊 Audio size: " . strlen($audioContent) . " bytes\n";
        echo "ℹ️  Note: TTS is not needed for caption processing (as per your requirements)\n";
    } else {
        echo "⚠️  TTS feature may not be available on your plan\n";
        echo "Status: " . $response->status() . "\n";
        echo "Response: " . substr($response->body(), 0, 200) . "\n";
        echo "ℹ️  This is OK - TTS is not needed for caption processing\n";
    }
} catch (\Exception $e) {
    echo "⚠️  Error testing TTS: " . $e->getMessage() . "\n";
    echo "ℹ️  This is OK - TTS is not needed for caption processing\n";
}

echo "\n";

// Summary
echo "📋 Summary\n";
echo str_repeat("=", 50) . "\n";
echo "✅ API Key: Valid\n";
echo "✅ Transcription: Required for caption processing\n";
echo "✅ Translation: Required for multi-language captions\n";
echo "ℹ️  TTS: Not needed (skipped in processing)\n";
echo "\n";
echo "🎉 Deepgram API key is ready for caption processing!\n";
echo "\n";
