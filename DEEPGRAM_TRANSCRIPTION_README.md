# Deepgram AI Transcription & Multi-Language Captions Implementation

## Overview

This implementation integrates **Deepgram AI** for automatic video transcription and **Google Translate** for multi-language support. Transcriptions are processed once in the backend and uploaded to Bunny.net as WebVTT caption files, making them available to all users without real-time API calls.

## Architecture

### Flow Diagram

```
Admin Panel (Upload Video)
        ↓
[Video uploaded to Bunny.net]
        ↓
Admin clicks "Process Captions (AI)"
        ↓
[Backend Service Processing]
├─→ Download video from Bunny.net
├─→ Deepgram transcribes audio (source language)
├─→ Generate WebVTT caption file
├─→ Translate transcription to other languages
├─→ Generate translated WebVTT files
└─→ Upload all captions to Bunny.net
        ↓
[Captions stored in database + Bunny.net]
        ↓
Frontend: User watches video
        ↓
Bunny.net player loads captions automatically
(User can select language from player UI)
```

## Backend Implementation

### 1. Database Schema

**Migrations Created:**
- `add_captions_and_transcription_to_videos_table.php`
- `add_captions_and_transcription_to_reels_table.php`
- `add_captions_and_transcription_to_rewinds_table.php`

**Fields Added:**
```php
$table->json('transcriptions')->nullable();
// Format: {
//   "en": {
//     "text": "Full transcription text",
//     "vtt": "WebVTT caption file content",
//     "bunny_caption_url": "https://...",
//     "processed_at": "2026-01-05 10:00:00"
//   },
//   "es": {...},
//   "pt": {...}
// }

$table->json('caption_urls')->nullable();
// Format: {
//   "en": "https://bunny.net/captions/video-123-en.vtt",
//   "es": "https://bunny.net/captions/video-123-es.vtt",
//   "pt": "https://bunny.net/captions/video-123-pt.vtt"
// }

$table->string('source_language', 10)->default('en');
$table->enum('transcription_status', ['pending', 'processing', 'completed', 'failed']);
$table->text('transcription_error')->nullable();
$table->timestamp('transcription_processed_at')->nullable();
```

### 2. Services Created

#### `DeepgramService.php`
- **Purpose**: Interface with Deepgram API for transcription
- **Key Methods**:
  - `transcribeFromUrl()` - Transcribe video from URL
  - `transcribeFromFile()` - Transcribe from local file
  - `generateWebVTT()` - Generate WebVTT caption format
  - `translateText()` - Translate text (uses free Google Translate library, **no API key needed**)
  - `translateWebVTT()` - Translate WebVTT while preserving timestamps
  - `processVideoMultiLanguage()` - Process video for multiple languages

**Important**: Translation uses `stichoza/google-translate-php` which is **FREE** and requires **NO API KEY**. If translation fails, it automatically falls back to the original language captions.

#### `VideoTranscriptionService.php`
- **Purpose**: Orchestrate the entire transcription workflow
- **Key Methods**:
  - `processVideoTranscription()` - Main processing method
  - `reprocessLanguage()` - Reprocess a specific language
  - `getTranscriptionStatus()` - Get current status
  
**Workflow:**
1. Update status to 'processing'
2. Get Bunny.net video URL and ID
3. Call Deepgram to transcribe source language
4. Generate WebVTT caption file
5. Upload source caption to Bunny.net
6. For each target language:
   - Translate transcription text
   - Translate WebVTT file (preserving timestamps)
   - Upload translated caption to Bunny.net
7. Store all data in database
8. Update status to 'completed'

#### `BunnyNetService.php` (Enhanced)
- **Existing Method Enhanced**: `uploadCaptions()`
- Uploads WebVTT caption files to Bunny.net video library
- Supports multiple languages per video

### 3. API Endpoints

**Routes added to `routes/api.php`:**

```php
// Admin-only routes
Route::post('/admin/videos/{id}/process-transcription', [VideoController::class, 'processTranscription']);
Route::get('/admin/videos/{id}/transcription-status', [VideoController::class, 'getTranscriptionStatus']);
Route::post('/admin/videos/{id}/reprocess-language', [VideoController::class, 'reprocessLanguage']);
```

**Controller Methods in `VideoController.php`:**
- `processTranscription()` - Trigger transcription processing
- `getTranscriptionStatus()` - Get current status
- `reprocessLanguage()` - Reprocess a specific language

### 4. Configuration

**`.env` variables required:**
```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

**`config/services.php`:**
```php
'deepgram' => [
    'api_key' => env('DEEPGRAM_API_KEY'),
],
```

## Frontend Implementation

### 1. Admin Panel

**Location**: `frontend/src/pages/admin/ContentManagement.tsx`

**Features Added:**
- **"Process Captions (AI)" button** in video dropdown menu
- Shows loading spinner while processing
- Success/error toast notifications
- Automatically refreshes video list after completion

**Usage:**
1. Navigate to Admin → Content Management → Videos tab
2. Click the three-dot menu (⋮) for any video with a Bunny.net video ID
3. Click "Process Captions (AI)"
4. Wait for processing (can take 1-5 minutes depending on video length)
5. Captions are now available in all 3 languages

### 2. Video API Service

**Location**: `frontend/src/services/videoApi.ts`

**Methods Added:**
```typescript
videoApi.processTranscription(id, languages?, sourceLanguage?)
videoApi.getTranscriptionStatus(id)
videoApi.reprocessLanguage(id, language, sourceLanguage?)
```

### 3. Video Players

**Files**: 
- `frontend/src/pages/ReelDetail.tsx`
- `frontend/src/pages/RewindEpisodes.tsx`

**How Captions Work:**
- Bunny.net player has **native controls enabled** (`controls=true`)
- When captions are uploaded, they appear in the player's built-in caption menu
- Users can click the "CC" button in the player to:
  - Enable/disable captions
  - Select language (English, Español, Português)
  - Adjust caption styling

**No additional frontend code needed!** Bunny.net handles everything automatically.

## Usage Guide

### For Admins

#### Processing a New Video

1. **Upload Video to Bunny.net** (via admin panel as usual)
2. **Create Video Entry** in the system with Bunny.net video ID
3. **Process Transcriptions**:
   ```
   Admin Panel → Content Management → Videos
   → Click ⋮ menu on video
   → Click "Process Captions (AI)"
   ```
4. **Wait for Processing** (notification will appear when complete)
5. **Captions are Ready!** Users can now select language in the video player

#### Reprocessing a Specific Language

If a translation needs to be updated:

```typescript
// API call (can be added to admin panel)
await videoApi.reprocessLanguage(videoId, 'es', 'en');
```

#### Checking Transcription Status

```typescript
const status = await videoApi.getTranscriptionStatus(videoId);
console.log(status);
// {
//   status: 'completed',
//   processed_at: '2026-01-05 12:00:00',
//   error: null,
//   languages: ['en', 'es', 'pt'],
//   caption_urls: { en: '...', es: '...', pt: '...' }
// }
```

### For End Users

1. **Watch any video** with processed captions
2. **Click the CC button** in the video player (bottom right)
3. **Select language**:
   - English
   - Español
   - Português
4. **Captions appear automatically** as the video plays

## Technical Details

### WebVTT Format

Deepgram generates captions in WebVTT format:

```vtt
WEBVTT
Language: en

1
00:00:00.000 --> 00:00:05.000
Welcome to this video tutorial.

2
00:00:05.000 --> 00:00:10.000
Today we'll learn about sacred art.
```

### Translation Process

1. **Text Translation**: Google Translate API translates the full transcription
2. **VTT Translation**: Each caption segment is translated individually
3. **Timestamp Preservation**: All timings remain exactly the same
4. **Format Maintenance**: WebVTT structure is preserved

### Performance Considerations

- **Processing Time**: 1-5 minutes per video (depending on length)
- **Deepgram Credits**: ~$0.0125 per minute of audio
- **Translation**: Free (using Google Translate library)
- **Storage**: Captions stored in database (JSON) and Bunny.net

## Error Handling

### Common Errors

**1. "Deepgram API key is not configured"**
- Solution: Add `DEEPGRAM_API_KEY` to `.env` file

**2. "No Bunny.net video URL found"**
- Solution: Ensure video has `bunny_embed_url` or `bunny_video_url` set

**3. "Deepgram transcription failed"**
- Possible causes:
  - Video audio is unavailable
  - Deepgram API quota exceeded
  - Network connectivity issues
- Solution: Check logs, verify Deepgram account status

**4. "Caption upload to Bunny.net failed"**
- Possible causes:
  - Invalid Bunny.net API key
  - Video not found in Bunny.net library
- Solution: Verify Bunny.net credentials

### Debugging

**Check transcription status:**
```php
$video = Video::find($id);
dd($video->transcription_status, $video->transcription_error, $video->transcriptions);
```

**Check logs:**
```bash
tail -f storage/logs/laravel.log | grep -i deepgram
```

## Future Enhancements

### Potential Improvements

1. **Real-time Transcription Display**
   - Show live transcription as video plays
   - Highlight current segment
   - Auto-scroll to active caption

2. **Custom Vocabulary**
   - Add technical terms to Deepgram
   - Improve accuracy for specialized content

3. **Multiple Audio Tracks**
   - Generate audio in different languages (TTS)
   - Upload as separate Bunny.net videos
   - Link to main video

4. **Batch Processing**
   - Process multiple videos at once
   - Queue system for large libraries
   - Progress tracking dashboard

5. **Caption Editing**
   - Admin interface to edit captions
   - Fix translation errors
   - Adjust timestamps

6. **Speaker Diarization**
   - Enable Deepgram's diarization feature
   - Identify different speakers
   - Show speaker labels in captions

## API Reference

### Deepgram API

**Documentation**: https://developers.deepgram.com/

**Models Used**:
- `nova-2`: Latest accuracy model
- Supports: Spanish, Portuguese, English, and 30+ languages

**Features Enabled**:
- `punctuate`: Add punctuation
- `smart_format`: Format currency, dates, etc.
- `utterances`: Group words into sentences
- `paragraphs`: Group sentences into paragraphs

### Bunny.net Captions API

**Documentation**: https://docs.bunny.net/reference/video_addcaption

**Endpoint**: `POST /library/{libraryId}/videos/{videoId}/captions`

**Parameters**:
- `srclang`: Language code (en, es, pt)
- `label`: Display label (English, Español)
- `content`: WebVTT file content

## Testing

### Manual Testing Steps

1. **Create a test video** (short, 1-2 minutes)
2. **Upload to Bunny.net** via admin panel
3. **Process transcriptions**
4. **Verify in database**:
   ```sql
   SELECT id, title, transcription_status, source_language, 
          JSON_KEYS(transcriptions) as languages
   FROM videos WHERE id = YOUR_VIDEO_ID;
   ```
5. **Test in frontend**:
   - Open video player
   - Enable captions
   - Switch between languages
   - Verify timing accuracy

### Automated Testing (Future)

```php
// Example PHPUnit test
public function test_video_transcription_processing()
{
    $video = Video::factory()->create([
        'bunny_video_url' => 'https://test-video-url.mp4',
        'bunny_video_id' => 'test-123',
    ]);

    $service = app(VideoTranscriptionService::class);
    $result = $service->processVideoTranscription($video, ['en', 'es'], 'en');

    $this->assertTrue($result['success']);
    $this->assertEquals('completed', $video->fresh()->transcription_status);
    $this->assertCount(2, $video->fresh()->transcriptions);
}
```

## Credits

- **Deepgram**: AI-powered speech recognition
- **Google Translate**: Text translation
- **Bunny.net**: Video hosting and caption delivery
- **Laravel**: Backend framework
- **React**: Frontend framework

## Support

For issues or questions:
1. Check this documentation
2. Review Laravel logs: `storage/logs/laravel.log`
3. Check Deepgram dashboard for API usage
4. Verify Bunny.net video library status

## License

This implementation is part of the Ana Rey Video platform.

---

**Last Updated**: January 5, 2026
**Version**: 1.0.0

