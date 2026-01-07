# Speech-to-Speech (STS) Multi-Language Audio Implementation

## Overview

You want users to **hear the video in their selected language**, not just read captions. This requires:

1. **Transcribe** original audio (English) → Deepgram ✅
2. **Translate** to Spanish & Portuguese → Google Translate ✅
3. **Text-to-Speech (TTS)** → Generate audio in each language
4. **Create language versions** → Separate videos or audio tracks

## Challenge: Bunny.net Limitation

**Bunny.net does NOT support multiple audio tracks in one video.**

## Solution Options

### Option 1: ElevenLabs TTS + Separate Videos (Recommended)
**Best quality, most realistic voices**

### Option 2: Google Cloud TTS + Separate Videos
**Good quality, lower cost**

### Option 3: Deepgram TTS + Separate Videos
**Integrated with existing service**

### Option 4: Client-Side Audio Switching
**Use Web Audio API to overlay TTS**

---

## Option 1: ElevenLabs TTS (Recommended - Best Quality)

### Why ElevenLabs?
- 🎯 **Most natural voices** (indistinguishable from humans)
- 🎯 Voice cloning available
- 🎯 Emotion and intonation
- 🎯 Multiple languages
- 🎯 Professional quality

### Cost
- **Free tier**: 10,000 characters/month (~10 minutes of speech)
- **Starter**: $5/month = 30,000 characters (~30 min)
- **Creator**: $22/month = 100,000 characters (~100 min)
- **Pro**: $99/month = 500,000 characters (~500 min)

### Implementation

#### Step 1: Get ElevenLabs API Key

1. Sign up at https://elevenlabs.io
2. Get API key from dashboard
3. Add to `.env`:
   ```env
   ELEVENLABS_API_KEY=your_api_key_here
   ```

#### Step 2: Install ElevenLabs SDK

```bash
composer require guzzlehttp/guzzle # Already have this
```

#### Step 3: Create ElevenLabs Service

Create `app/Services/ElevenLabsService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class ElevenLabsService
{
    protected $apiKey;
    protected $baseUrl = 'https://api.elevenlabs.io/v1';

    public function __construct()
    {
        $this->apiKey = config('services.elevenlabs.api_key');
        
        if (empty($this->apiKey)) {
            throw new Exception('ElevenLabs API key is not configured');
        }
    }

    /**
     * Generate speech from text
     * 
     * @param string $text Text to convert to speech
     * @param string $language Language code (en, es, pt)
     * @param string $voiceId ElevenLabs voice ID
     * @return array ['success' => bool, 'audio_path' => string, 'audio_url' => string]
     */
    public function textToSpeech(string $text, string $language = 'en', ?string $voiceId = null): array
    {
        try {
            // Get appropriate voice for language
            if (!$voiceId) {
                $voiceId = $this->getVoiceForLanguage($language);
            }

            $url = "{$this->baseUrl}/text-to-speech/{$voiceId}";

            Log::info('ElevenLabs TTS request', [
                'language' => $language,
                'voice_id' => $voiceId,
                'text_length' => strlen($text),
            ]);

            $response = Http::timeout(120)
                ->withHeaders([
                    'xi-api-key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($url, [
                    'text' => $text,
                    'model_id' => 'eleven_multilingual_v2', // Supports multiple languages
                    'voice_settings' => [
                        'stability' => 0.5,
                        'similarity_boost' => 0.75,
                        'style' => 0.0,
                        'use_speaker_boost' => true,
                    ],
                ]);

            if (!$response->successful()) {
                Log::error('ElevenLabs TTS failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => 'ElevenLabs API error: ' . $response->body(),
                ];
            }

            // Save audio file
            $audioContent = $response->body();
            $filename = 'tts/' . uniqid() . '-' . $language . '.mp3';
            Storage::disk('public')->put($filename, $audioContent);

            $audioPath = storage_path('app/public/' . $filename);
            $audioUrl = Storage::disk('public')->url($filename);

            Log::info('ElevenLabs TTS completed', [
                'language' => $language,
                'file_size' => strlen($audioContent),
                'path' => $audioPath,
            ]);

            return [
                'success' => true,
                'audio_path' => $audioPath,
                'audio_url' => $audioUrl,
                'filename' => $filename,
            ];

        } catch (Exception $e) {
            Log::error('ElevenLabs TTS exception', [
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
     * Get appropriate voice ID for language
     */
    protected function getVoiceForLanguage(string $language): string
    {
        // Default multilingual voices
        // You can customize these in config or database
        $voices = [
            'en' => config('services.elevenlabs.voice_en', 'EXAVITQu4vr4xnSDxMaL'), // Sarah (female)
            'es' => config('services.elevenlabs.voice_es', 'VR6AewLTigWG4xSOukaG'), // Arnold (male, Spanish)
            'pt' => config('services.elevenlabs.voice_pt', 'pNInz6obpgDQGcFmaJgB'), // Adam (male, multilingual)
        ];

        return $voices[$language] ?? $voices['en'];
    }

    /**
     * Get available voices
     */
    public function getVoices(): array
    {
        try {
            $response = Http::withHeaders([
                'xi-api-key' => $this->apiKey,
            ])->get("{$this->baseUrl}/voices");

            if ($response->successful()) {
                return $response->json()['voices'] ?? [];
            }

            return [];

        } catch (Exception $e) {
            Log::error('Failed to get ElevenLabs voices', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Generate speech for video transcription with timing
     * Processes transcription segments and generates audio
     */
    public function generateVideoAudio(array $transcriptionSegments, string $language): array
    {
        try {
            // Combine all segments into full text
            $fullText = implode(' ', array_map(function($segment) {
                return $segment['text'] ?? $segment;
            }, $transcriptionSegments));

            // Generate audio for full text
            return $this->textToSpeech($fullText, $language);

        } catch (Exception $e) {
            Log::error('Video audio generation failed', [
                'error' => $e->getMessage(),
                'language' => $language,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
```

#### Step 4: Update Config

Add to `config/services.php`:

```php
'elevenlabs' => [
    'api_key' => env('ELEVENLABS_API_KEY'),
    'voice_en' => env('ELEVENLABS_VOICE_EN', 'EXAVITQu4vr4xnSDxMaL'),
    'voice_es' => env('ELEVENLABS_VOICE_ES', 'VR6AewLTigWG4xSOukaG'),
    'voice_pt' => env('ELEVENLABS_VOICE_PT', 'pNInz6obpgDQGcFmaJgB'),
],
```

#### Step 5: Create Multi-Language Video Service

Create `app/Services/MultiLanguageVideoService.php`:

```php
<?php

namespace App\Services;

use App\Models\Video;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class MultiLanguageVideoService
{
    protected $deepgramService;
    protected $bunnyNetService;
    protected $elevenLabsService;
    protected $translateService;

    public function __construct(
        DeepgramService $deepgramService,
        BunnyNetService $bunnyNetService,
        ElevenLabsService $elevenLabsService,
        GoogleTranslateService $translateService
    ) {
        $this->deepgramService = $deepgramService;
        $this->bunnyNetService = $bunnyNetService;
        $this->elevenLabsService = $elevenLabsService;
        $this->translateService = $translateService;
    }

    /**
     * Process video for multiple languages with TTS audio
     * Creates separate video versions for each language
     */
    public function processMultiLanguageVideo($model, array $languages = ['en', 'es', 'pt'], string $sourceLanguage = 'en'): array
    {
        try {
            Log::info('Starting multi-language video processing', [
                'model_id' => $model->id,
                'languages' => $languages,
            ]);

            $model->update([
                'transcription_status' => 'processing',
            ]);

            // Step 1: Get original video
            $videoUrl = $this->getBunnyVideoUrl($model);
            if (!$videoUrl) {
                throw new Exception('No video URL found');
            }

            // Step 2: Transcribe in source language
            $transcription = $this->deepgramService->transcribeFromUrl($videoUrl, $sourceLanguage);
            if (!$transcription['success']) {
                throw new Exception('Transcription failed: ' . ($transcription['error'] ?? 'Unknown'));
            }

            $results = [];
            $audioFiles = [];

            // Step 3: For each language, generate TTS audio
            foreach ($languages as $language) {
                try {
                    Log::info("Processing language: {$language}");

                    // Get text (translate if not source language)
                    if ($language === $sourceLanguage) {
                        $text = $transcription['transcription'];
                    } else {
                        $translateResult = $this->translateService->translate(
                            $transcription['transcription'],
                            $language,
                            $sourceLanguage
                        );
                        $text = $translateResult;
                    }

                    // Generate TTS audio
                    $ttsResult = $this->elevenLabsService->textToSpeech($text, $language);

                    if ($ttsResult['success']) {
                        $audioFiles[$language] = [
                            'path' => $ttsResult['audio_path'],
                            'url' => $ttsResult['audio_url'],
                            'text' => $text,
                        ];

                        $results[$language] = [
                            'success' => true,
                            'audio_generated' => true,
                            'audio_url' => $ttsResult['audio_url'],
                        ];
                    } else {
                        $results[$language] = [
                            'success' => false,
                            'error' => $ttsResult['error'] ?? 'TTS failed',
                        ];
                    }

                } catch (Exception $e) {
                    Log::error("Failed to process language {$language}", [
                        'error' => $e->getMessage(),
                    ]);

                    $results[$language] = [
                        'success' => false,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            // Step 4: Store audio URLs in database
            $model->update([
                'transcriptions' => array_merge($model->transcriptions ?? [], [
                    'audio_files' => $audioFiles,
                ]),
                'transcription_status' => 'completed',
                'transcription_processed_at' => now(),
            ]);

            return [
                'success' => true,
                'message' => 'Multi-language audio processing completed',
                'data' => [
                    'audio_files' => $audioFiles,
                    'results' => $results,
                ],
            ];

        } catch (Exception $e) {
            Log::error('Multi-language video processing failed', [
                'error' => $e->getMessage(),
                'model_id' => $model->id,
            ]);

            $model->update([
                'transcription_status' => 'failed',
                'transcription_error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    protected function getBunnyVideoUrl($model): ?string
    {
        return $model->bunny_video_url 
            ?? $model->bunny_embed_url 
            ?? $model->bunny_player_url;
    }
}
```

#### Step 6: Frontend Audio Switching

Update video player to switch audio based on selected language:

Create `frontend/src/components/MultiLanguagePlayer.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react';

interface AudioTrack {
  language: string;
  url: string;
  label: string;
}

interface MultiLanguagePlayerProps {
  videoUrl: string;
  audioTracks: AudioTrack[];
  defaultLanguage?: string;
}

export const MultiLanguagePlayer: React.FC<MultiLanguagePlayerProps> = ({
  videoUrl,
  audioTracks,
  defaultLanguage = 'en'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync audio with video
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio) return;

    const syncAudio = () => {
      audio.currentTime = video.currentTime;
    };

    const handleVideoPlay = () => {
      audio.play();
      setIsPlaying(true);
    };

    const handleVideoPause = () => {
      audio.pause();
      setIsPlaying(false);
    };

    const handleVideoSeeking = () => {
      audio.currentTime = video.currentTime;
    };

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('seeking', handleVideoSeeking);
    video.addEventListener('timeupdate', syncAudio);

    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('seeking', handleVideoSeeking);
      video.removeEventListener('timeupdate', syncAudio);
    };
  }, []);

  // Change audio source when language changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentTime = audio.currentTime;
    const wasPlaying = !audio.paused;

    // Change audio source
    const track = audioTracks.find(t => t.language === selectedLanguage);
    if (track) {
      audio.src = track.url;
      audio.currentTime = currentTime;
      
      if (wasPlaying) {
        audio.play();
      }
    }
  }, [selectedLanguage, audioTracks]);

  const currentTrack = audioTracks.find(t => t.language === selectedLanguage);

  return (
    <div className="relative">
      {/* Video with original audio muted */}
      <video
        ref={videoRef}
        src={videoUrl}
        muted // Mute original audio
        className="w-full h-full"
        controls
      />

      {/* Hidden audio player for dubbed audio */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        className="hidden"
      />

      {/* Language selector */}
      <div className="absolute top-4 right-4 bg-black/70 rounded-lg p-2">
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="bg-transparent text-white border-none outline-none cursor-pointer"
        >
          {audioTracks.map(track => (
            <option key={track.language} value={track.language}>
              {track.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
```

---

## Option 2: Google Cloud TTS (Lower Cost)

### Cost
- **Free tier**: 1 million characters/month (~1,000 minutes)
- **Paid**: $4 per 1 million characters

### Setup

1. Get API key from Google Cloud Console
2. Enable Cloud Text-to-Speech API
3. Add to `.env`:
   ```env
   GOOGLE_CLOUD_TTS_API_KEY=your_key
   ```

4. Install:
   ```bash
   composer require google/cloud-text-to-speech
   ```

### Implementation

Create `app/Services/GoogleTTSService.php`:

```php
<?php

namespace App\Services;

use Google\Cloud\TextToSpeech\V1\TextToSpeechClient;
use Google\Cloud\TextToSpeech\V1\SynthesisInput;
use Google\Cloud\TextToSpeech\V1\VoiceSelectionParams;
use Google\Cloud\TextToSpeech\V1\AudioConfig;
use Google\Cloud\TextToSpeech\V1\AudioEncoding;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class GoogleTTSService
{
    protected $client;

    public function __construct()
    {
        $this->client = new TextToSpeechClient([
            'credentials' => config('services.google_cloud.credentials_path'),
        ]);
    }

    public function textToSpeech(string $text, string $language = 'en'): array
    {
        try {
            // Map language codes
            $languageCodes = [
                'en' => 'en-US',
                'es' => 'es-ES',
                'pt' => 'pt-BR',
            ];

            $langCode = $languageCodes[$language] ?? 'en-US';

            $input = new SynthesisInput();
            $input->setText($text);

            $voice = new VoiceSelectionParams();
            $voice->setLanguageCode($langCode);
            $voice->setSsmlGender(\Google\Cloud\TextToSpeech\V1\SsmlVoiceGender::NEUTRAL);

            $audioConfig = new AudioConfig();
            $audioConfig->setAudioEncoding(AudioEncoding::MP3);
            $audioConfig->setSpeakingRate(1.0);
            $audioConfig->setPitch(0.0);

            $response = $this->client->synthesizeSpeech($input, $voice, $audioConfig);
            $audioContent = $response->getAudioContent();

            // Save file
            $filename = 'tts/' . uniqid() . '-' . $language . '.mp3';
            Storage::disk('public')->put($filename, $audioContent);

            return [
                'success' => true,
                'audio_path' => storage_path('app/public/' . $filename),
                'audio_url' => Storage::disk('public')->url($filename),
            ];

        } catch (\Exception $e) {
            Log::error('Google TTS failed', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
```

---

## Comparison

| Solution | Voice Quality | Cost (100 videos, 15min each) | Setup Time |
|----------|--------------|-------------------------------|------------|
| ElevenLabs | ⭐⭐⭐⭐⭐ (Best) | $22-99/month | 30 min |
| Google Cloud TTS | ⭐⭐⭐⭐ (Good) | ~$12 one-time | 45 min |
| Deepgram TTS | ⭐⭐⭐ (Decent) | Included with Deepgram | 20 min |

---

## Recommended Workflow

1. **Transcribe** video with Deepgram (English) ✅
2. **Translate** to Spanish & Portuguese ✅
3. **Generate TTS** audio for each language → ElevenLabs/Google
4. **Store audio URLs** in database
5. **Frontend**: Mute original video, overlay selected language audio
6. **User selects language** → Audio switches seamlessly

---

## Next Steps

Would you like me to implement:
- **Option 1**: ElevenLabs TTS (best quality, highest cost)
- **Option 2**: Google Cloud TTS (good quality, lower cost)
- **Option 3**: Simple approach (just provide audio files for download)

Let me know and I'll implement the complete solution!





