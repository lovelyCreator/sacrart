# Deepgram Setup Guide - Quick Start

## Prerequisites

1. **Deepgram Account**: Sign up at https://deepgram.com
2. **Deepgram API Key**: Get from your Deepgram dashboard
3. **Bunny.net Account**: Already configured
4. **Database Access**: To run migrations

## Step 1: Get Deepgram API Key

1. Go to https://console.deepgram.com
2. Create a new account or sign in
3. Navigate to **API Keys** section
4. Click **Create a New API Key**
5. Copy the API key (starts with something like `a1b2c3d4...`)

**Free Tier**: Deepgram offers $200 in free credits for new accounts!

## Step 2: Add API Key to Environment

Add to your `.env` file:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

## Step 3: Run Database Migrations

```bash
php artisan migrate
```

This will add the following fields to your database tables:
- `transcriptions` (JSON)
- `caption_urls` (JSON)
- `source_language` (string)
- `transcription_status` (enum)
- `transcription_error` (text)
- `transcription_processed_at` (timestamp)

## Step 4: Test the Implementation

### Backend Test

```bash
# Optional: Test Deepgram connection
php artisan tinker
```

```php
$service = app(\App\Services\DeepgramService::class);
$result = $service->transcribeFromUrl('https://sample-video-url.mp4', 'en');
dd($result);
```

### Frontend Test

1. **Start the development server** (if not already running):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Login to admin panel**:
   - Go to `/admin/content-management`
   - Navigate to **Videos** tab

3. **Process a video**:
   - Find a video with Bunny.net video ID
   - Click the ⋮ menu
   - Click **"Process Captions (AI)"**
   - Wait for completion notification

4. **Test in frontend**:
   - Open the video in the public site
   - Click the **CC** button in the player
   - Verify captions appear
   - Switch between languages

## Step 5: Verify Caption Upload

### Check Database

```sql
SELECT 
    id, 
    title, 
    transcription_status, 
    source_language,
    JSON_KEYS(transcriptions) as languages,
    JSON_KEYS(caption_urls) as caption_urls
FROM videos 
WHERE transcription_status = 'completed';
```

### Check Bunny.net

1. Login to Bunny.net dashboard
2. Go to **Stream** → **Video Library**
3. Find your video
4. Click **Edit**
5. Check **Captions** section - you should see:
   - English caption
   - Español caption
   - Português caption

## Troubleshooting

### "Deepgram API key is not configured"

**Solution**: 
1. Check `.env` file has `DEEPGRAM_API_KEY`
2. Clear config cache: `php artisan config:clear`
3. Restart server

### "No Bunny.net video URL found"

**Solution**: 
Ensure the video has one of these fields set:
- `bunny_embed_url`
- `bunny_video_url`
- `bunny_player_url`

### "Transcription status stuck on 'processing'"

**Solution**:
1. Check Laravel logs: `tail -f storage/logs/laravel.log`
2. Manually reset status:
   ```sql
   UPDATE videos SET transcription_status = 'pending' WHERE id = YOUR_VIDEO_ID;
   ```
3. Try processing again

### Caption upload failed

**Solution**:
1. Verify Bunny.net API key is correct
2. Check video exists in Bunny.net library
3. Verify `bunny_video_id` matches the actual Bunny.net video ID

## Cost Estimation

### Deepgram Pricing

- **Pay-as-you-go**: $0.0125 per minute
- **Free tier**: $200 credit (~16,000 minutes)

**Examples**:
- 5-minute video: $0.06
- 30-minute video: $0.38
- 60-minute video: $0.75

### Translation (Google Translate)

- **Free** (using open-source library)
- No API costs

### Total Cost Example

Processing 100 videos (average 15 minutes each):
- **Deepgram**: 100 × 15 × $0.0125 = **$18.75**
- **Translation**: **$0**
- **Total**: **$18.75**

## Next Steps

1. ✅ Process a few test videos
2. ✅ Verify captions work in all languages
3. ✅ Check caption accuracy
4. ⏭️ Process your entire video library
5. ⏭️ (Optional) Set up batch processing

## Batch Processing Script (Optional)

If you want to process multiple videos at once:

```bash
php artisan tinker
```

```php
use App\Models\Video;
use App\Services\VideoTranscriptionService;

$service = app(VideoTranscriptionService::class);

// Get all videos without transcriptions
$videos = Video::whereNull('transcription_status')
    ->orWhere('transcription_status', 'pending')
    ->whereNotNull('bunny_video_id')
    ->get();

foreach ($videos as $video) {
    echo "Processing video: {$video->title}\n";
    $result = $service->processVideoTranscription($video, ['en', 'es', 'pt'], 'en');
    
    if ($result['success']) {
        echo "✓ Success\n";
    } else {
        echo "✗ Failed: {$result['message']}\n";
    }
    
    // Wait 2 seconds between videos to avoid rate limits
    sleep(2);
}

echo "\nBatch processing complete!\n";
```

## Support Resources

- **Deepgram Docs**: https://developers.deepgram.com/
- **Bunny.net Docs**: https://docs.bunny.net/
- **Implementation Details**: See `DEEPGRAM_TRANSCRIPTION_README.md`

---

**Setup Time**: ~10 minutes
**First Video Processing**: ~3-5 minutes
**Subsequent Videos**: ~1-3 minutes each

**Questions?** Check the main README or review the Laravel logs.





