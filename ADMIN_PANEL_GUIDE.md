# Admin Panel Guide - Caption Processing

## How to Process Captions for Videos

### Step-by-Step Visual Guide

#### 1. Navigate to Content Management

```
Admin Dashboard → Content Management → Videos Tab
```

![Navigation Path]
```
┌─────────────────────────────────────┐
│  Admin Panel                        │
│  ├─ Dashboard                       │
│  ├─ Content Management  ← Click Here│
│  │  ├─ Categories                   │
│  │  ├─ Series                       │
│  │  └─ Videos          ← Click Here │
│  ├─ Reels Management                │
│  ├─ Rewinds Management              │
│  └─ Users                           │
└─────────────────────────────────────┘
```

#### 2. Find Your Video

The videos table shows all your uploaded videos:

```
┌────────────────────────────────────────────────────────────────┐
│ Videos                                    [+ Add New Video]      │
├────────────────────────────────────────────────────────────────┤
│ Title          │ Category  │ Series   │ Status    │ Actions  │ │
├────────────────────────────────────────────────────────────────┤
│ Sacred Art 101 │ Tutorials │ Basics   │ Published │   ⋮      │ │
│ Painting Tips  │ Tutorials │ Advanced │ Published │   ⋮      │ │
│ Color Theory   │ Tutorials │ Basics   │ Draft     │   ⋮      │ │
└────────────────────────────────────────────────────────────────┘
```

#### 3. Open Actions Menu

Click the three-dot menu (⋮) for any video:

```
┌─────────────────────────┐
│ Actions                 │
├─────────────────────────┤
│ ✏️  Edit                │
│ ⭐ Add to Featured      │
│ 🕐 Fetch Duration       │
│ 📝 Process Captions (AI) │ ← NEW! Click this
│ 🗑️  Delete              │
└─────────────────────────┘
```

**Note**: The "Process Captions (AI)" button only appears if the video has a `bunny_video_id`.

#### 4. Confirm Processing

A confirmation dialog will appear:

```
┌──────────────────────────────────────────┐
│  Process Captions                        │
├──────────────────────────────────────────┤
│  Process transcriptions for this video?  │
│  This will generate captions in:         │
│  • English                                │
│  • Spanish                                │
│  • Portuguese                             │
│                                           │
│  Using Deepgram AI.                       │
│                                           │
│         [Cancel]  [Process]               │
└──────────────────────────────────────────┘
```

#### 5. Wait for Processing

A loading spinner appears in the button:

```
┌─────────────────────────┐
│ Actions                 │
├─────────────────────────┤
│ ✏️  Edit                │
│ ⭐ Add to Featured      │
│ 🕐 Fetch Duration       │
│ ⏳ Processing...        │ ← Loading
│ 🗑️  Delete              │
└─────────────────────────┘
```

**Processing Time**:
- 5 min video: ~1 minute
- 15 min video: ~2 minutes
- 30 min video: ~3 minutes
- 60 min video: ~5 minutes

#### 6. Success Notification

When complete, you'll see:

```
┌────────────────────────────────────────┐
│  ✓ Success                             │
│  Video transcription and captions      │
│  processed successfully                │
└────────────────────────────────────────┘
```

Or if there's an error:

```
┌────────────────────────────────────────┐
│  ✗ Error                               │
│  Failed to process transcription       │
│  [Error details]                       │
└────────────────────────────────────────┘
```

## What Happens Behind the Scenes

### 1. Deepgram Transcription
```
Your Video (Bunny.net)
        ↓
Deepgram AI analyzes audio
        ↓
Generates English transcription
        ↓
Creates WebVTT caption file
```

### 2. Translation
```
English Transcription
        ↓
Google Translate
        ↓
Spanish Translation + WebVTT
        ↓
Portuguese Translation + WebVTT
```

### 3. Upload to Bunny.net
```
3 Caption Files Generated:
├─ video-123-en.vtt
├─ video-123-es.vtt
└─ video-123-pt.vtt
        ↓
Uploaded to Bunny.net Video Library
        ↓
Automatically available in player!
```

### 4. Database Update
```
videos table updated with:
├─ transcriptions (JSON)
│  ├─ en: {text, vtt, url}
│  ├─ es: {text, vtt, url}
│  └─ pt: {text, vtt, url}
├─ caption_urls (JSON)
│  ├─ en: "https://..."
│  ├─ es: "https://..."
│  └─ pt: "https://..."
├─ transcription_status: "completed"
└─ transcription_processed_at: "2026-01-05 12:00:00"
```

## Verifying Caption Upload

### Check in Database

After processing, you can verify in database:

```sql
SELECT 
    id,
    title,
    transcription_status,
    JSON_KEYS(transcriptions) as languages
FROM videos 
WHERE id = YOUR_VIDEO_ID;
```

Expected result:
```
┌────┬─────────────────┬──────────────────────┬──────────────────┐
│ id │ title           │ transcription_status │ languages        │
├────┼─────────────────┼──────────────────────┼──────────────────┤
│ 42 │ Sacred Art 101  │ completed            │ ["en","es","pt"] │
└────┴─────────────────┴──────────────────────┴──────────────────┘
```

### Check in Bunny.net Dashboard

1. Go to https://dash.bunny.net
2. Navigate to **Stream** → **Video Library**
3. Find your video
4. Click **Edit**
5. Scroll to **Captions** section

You should see:
```
Captions:
├─ English (en)     [Uploaded]
├─ Español (es)     [Uploaded]
└─ Português (pt)   [Uploaded]
```

### Test in Frontend

1. Open the video on your site
2. The video player should show a **CC** button
3. Click **CC** button
4. You should see:
   ```
   Subtitles:
   ├─ Off
   ├─ English     ← Click to enable
   ├─ Español     ← Click to enable
   └─ Português   ← Click to enable
   ```

## Batch Processing Multiple Videos

If you want to process many videos at once, use this script:

### Option 1: Via Tinker

```bash
php artisan tinker
```

```php
use App\Models\Video;
use App\Services\VideoTranscriptionService;

$service = app(VideoTranscriptionService::class);

// Process all videos without captions
$videos = Video::whereNull('transcription_status')
    ->whereNotNull('bunny_video_id')
    ->limit(10) // Start with 10 videos
    ->get();

foreach ($videos as $video) {
    echo "Processing: {$video->title}\n";
    $service->processVideoTranscription($video, ['en', 'es', 'pt'], 'en');
    sleep(3); // Wait 3 seconds between videos
}
```

### Option 2: Create Artisan Command (Advanced)

Create `app/Console/Commands/ProcessCaptions.php`:

```php
php artisan make:command ProcessCaptions
```

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Video;
use App\Services\VideoTranscriptionService;

class ProcessCaptions extends Command
{
    protected $signature = 'captions:process {--limit=10}';
    protected $description = 'Process video captions in batch';

    public function handle(VideoTranscriptionService $service)
    {
        $limit = $this->option('limit');
        
        $videos = Video::whereNull('transcription_status')
            ->whereNotNull('bunny_video_id')
            ->limit($limit)
            ->get();

        $this->info("Processing {$videos->count()} videos...");
        
        $bar = $this->output->createProgressBar($videos->count());

        foreach ($videos as $video) {
            $this->line("\nProcessing: {$video->title}");
            
            $result = $service->processVideoTranscription(
                $video, 
                ['en', 'es', 'pt'], 
                'en'
            );

            if ($result['success']) {
                $this->info("✓ Success");
            } else {
                $this->error("✗ Failed: {$result['message']}");
            }

            $bar->advance();
            sleep(2);
        }

        $bar->finish();
        $this->line("\n\nBatch processing complete!");
    }
}
```

Then run:
```bash
php artisan captions:process --limit=50
```

## Troubleshooting

### Button is Missing

**Possible reasons**:
1. Video doesn't have `bunny_video_id`
2. Not logged in as admin
3. Page cache needs refresh

**Solution**:
- Edit the video and ensure Bunny.net video ID is set
- Refresh the page
- Clear browser cache

### Processing Fails

**Check Laravel logs**:
```bash
tail -f storage/logs/laravel.log | grep -i deepgram
```

**Common errors**:
```
Error: "Deepgram API key is not configured"
→ Solution: Add DEEPGRAM_API_KEY to .env

Error: "No Bunny.net video URL found"
→ Solution: Ensure video has bunny_embed_url set

Error: "Bunny.net video not found"
→ Solution: Check bunny_video_id is correct
```

### Captions Not Showing in Player

**Checklist**:
- [ ] Processing completed successfully?
- [ ] Check database: `transcription_status = 'completed'`?
- [ ] Check Bunny.net dashboard for captions?
- [ ] Try another browser/device
- [ ] Clear player cache (reload page)

**If still not working**:
1. Check if captions exist in Bunny.net:
   - Login to Bunny.net
   - Find video in library
   - Check "Captions" section

2. Re-process captions:
   - Click "Process Captions (AI)" again
   - Wait for completion

## Best Practices

### Before Processing
1. ✅ Ensure video audio is clear
2. ✅ Check video is fully uploaded to Bunny.net
3. ✅ Verify bunny_video_id is set
4. ✅ Test with one short video first

### During Processing
1. ⏱️ Don't close the browser
2. ⏱️ Wait for success notification
3. ⏱️ Don't process the same video twice simultaneously

### After Processing
1. ✓ Verify in database
2. ✓ Check Bunny.net dashboard
3. ✓ Test in frontend player
4. ✓ Try switching languages

## Caption Quality Tips

For best transcription quality:

1. **Audio Quality**:
   - Clear, crisp audio
   - Minimal background noise
   - Good microphone

2. **Speech**:
   - Clear pronunciation
   - Normal speaking pace
   - Minimize long pauses

3. **Language**:
   - Set correct source language
   - Use standard accent/dialect

4. **Technical**:
   - Good audio bitrate (128kbps+)
   - Proper audio levels (not too quiet/loud)

## Cost Tracking

Monitor your Deepgram usage:

1. Go to https://console.deepgram.com
2. Check **Usage** dashboard
3. View:
   - Minutes transcribed
   - Credits used
   - Remaining balance

**Example costs**:
```
10 videos × 15 min = 150 min × $0.0125 = $1.88
50 videos × 15 min = 750 min × $0.0125 = $9.38
100 videos × 15 min = 1,500 min × $0.0125 = $18.75
```

## Support

**Need help?**
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check Deepgram dashboard for API errors
3. Verify Bunny.net credentials
4. Read `DEEPGRAM_SETUP_GUIDE.md`
5. Read `DEEPGRAM_TRANSCRIPTION_README.md`

---

**Admin Panel Guide Version**: 1.0  
**Last Updated**: January 5, 2026  
**Status**: Production Ready





