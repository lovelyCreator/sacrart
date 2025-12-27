# Google Cloud Audio Translation Implementation Guide

## Overview
This guide explains how to implement multi-language audio tracks for videos using Google Cloud APIs.

## Required Google Cloud APIs

You'll need to enable these APIs in your Google Cloud Console:

### 1. **Speech-to-Text API** (Required)
- **Purpose**: Detect language and transcribe audio to text
- **API Name**: `speech.googleapis.com`
- **Key Features**:
  - Automatic language detection
  - Speech recognition in 100+ languages
  - Returns confidence scores
- **Pricing**: Pay per 15-second increment
- **Documentation**: https://cloud.google.com/speech-to-text/docs

### 2. **Translation API** (Required)
- **Purpose**: Translate transcribed text to target languages
- **API Name**: `translate.googleapis.com`
- **Key Features**:
  - Translate between 100+ languages
  - Batch translation support
  - Preserves formatting
- **Pricing**: Pay per character translated
- **Documentation**: https://cloud.google.com/translate/docs

### 3. **Text-to-Speech API** (Required)
- **Purpose**: Generate audio from translated text
- **API Name**: `texttospeech.googleapis.com`
- **Key Features**:
  - Natural-sounding voices in 40+ languages
  - Multiple voice options per language
  - SSML support for better pronunciation
- **Pricing**: Pay per character synthesized
- **Documentation**: https://cloud.google.com/text-to-speech/docs

## Implementation Flow

```
1. Upload Video to Bunny.net
   ↓
2. Extract Audio from Video (FFMpeg)
   ↓
3. Detect Language (Speech-to-Text API)
   ↓
4. Transcribe Audio (Speech-to-Text API)
   ↓
5. Translate Text (Translation API)
   ↓
6. Generate Audio Tracks (Text-to-Speech API)
   ↓
7. Upload Audio Tracks to Bunny.net
   ↓
8. Link Audio Tracks to Video
```

## Step-by-Step Implementation

### Step 1: Setup Google Cloud Credentials

1. **Create Service Account**:
   - Go to Google Cloud Console → IAM & Admin → Service Accounts
   - Create a new service account
   - Grant roles:
     - `Cloud Speech-to-Text API User`
     - `Cloud Translation API User`
     - `Cloud Text-to-Speech API User`

2. **Download JSON Key**:
   - Create and download JSON key file
   - Store in `storage/app/google-cloud/` (add to `.gitignore`)

3. **Set Environment Variables**:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=storage/app/google-cloud/service-account-key.json
   ```

### Step 2: Install Required Packages

```bash
composer require google/cloud-speech
composer require google/cloud-translate
composer require google/cloud-text-to-speech
```

### Step 3: Extract Audio from Video

Use FFMpeg (already in your codebase) to extract audio:

```php
// Extract audio track from video
$audioPath = $this->extractAudioFromVideo($videoPath);
```

### Step 4: Detect Language & Transcribe

```php
// Use Speech-to-Text API to:
// 1. Detect language automatically
// 2. Transcribe audio to text
$transcription = $this->detectAndTranscribe($audioPath);
// Returns: ['language' => 'es', 'text' => 'transcribed text', 'confidence' => 0.95]
```

### Step 5: Translate Text

```php
// Translate to target languages
$translations = $this->translateText(
    $transcription['text'],
    $transcription['language'], // Source language
    ['en', 'pt'] // Target languages
);
// Returns: ['en' => 'English text', 'pt' => 'Portuguese text']
```

### Step 6: Generate Audio Tracks

```php
// Generate audio for each translated language
foreach ($translations as $lang => $text) {
    $audioFile = $this->textToSpeech($text, $lang);
    // Upload to Bunny.net and link to video
}
```

### Step 7: Upload to Bunny.net

**Important Note**: Bunny.net Stream API doesn't natively support multiple audio tracks in a single video. You have two options:

#### Option A: Store Audio Track Video IDs (Recommended)
Store separate video IDs for each language version:
- Main video (original language) - `bunny_video_id`
- Audio-only videos for each translated language - `bunny_video_id_en`, `bunny_video_id_pt`
- Frontend switches between videos based on user language

#### Option B: Use Captions/Subtitles (Alternative)
- Upload translated audio as captions/subtitles
- Use Bunny.net player's caption system
- Note: This shows subtitles, not replaces audio

**Implementation for Option A**:
```php
// Upload each audio track as a separate video to Bunny.net
// Store video IDs in database: bunny_video_id_es, bunny_video_id_en, bunny_video_id_pt
// Frontend selects appropriate video based on user language
```

## Cost Estimation

For a 10-minute video:
- **Speech-to-Text**: ~$0.60 (40 × 15-second increments × $0.006)
- **Translation**: ~$0.10 (assuming 2000 characters × $0.00005 per char)
- **Text-to-Speech**: ~$0.40 (2000 characters × $0.0002 per char)

**Total per video**: ~$1.10 for 2 additional languages

## Alternative: Media Translation API

Google Cloud also offers **Media Translation API** which combines some steps:
- Can translate audio directly (no transcription needed)
- Supports streaming translation
- **API Name**: `mediatranslation.googleapis.com`
- **Limitation**: May have fewer language pairs than separate APIs

## Recommended Approach

**Use separate APIs** (Speech-to-Text + Translation + Text-to-Speech):
- More control over the process
- Better quality (can review/edit transcriptions)
- More language options
- Can cache transcriptions for future use

## Database Schema Changes Needed

Add fields to `videos` table:
```sql
ALTER TABLE videos ADD COLUMN original_audio_language VARCHAR(10) NULL;
ALTER TABLE videos ADD COLUMN bunny_video_id_en VARCHAR(255) NULL;
ALTER TABLE videos ADD COLUMN bunny_video_id_pt VARCHAR(255) NULL;
ALTER TABLE videos ADD COLUMN bunny_video_id_es VARCHAR(255) NULL;
ALTER TABLE videos ADD COLUMN bunny_embed_url_en VARCHAR(500) NULL;
ALTER TABLE videos ADD COLUMN bunny_embed_url_pt VARCHAR(500) NULL;
ALTER TABLE videos ADD COLUMN bunny_embed_url_es VARCHAR(500) NULL;
```

**Note**: Since Bunny.net doesn't support multiple audio tracks in one video, we store separate video IDs for each language.

## Implementation Priority

1. **Phase 1**: Language detection + transcription
2. **Phase 2**: Translation to one target language
3. **Phase 3**: Text-to-speech generation
4. **Phase 4**: Upload audio tracks to Bunny.net
5. **Phase 5**: Frontend language switching

