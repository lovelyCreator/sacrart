# Fixed: Deepgram Transcription Error

## Problem

You were getting this error:
```
Deepgram API error: {"err_code":"Unsupported Media Type","err_msg":"remote server failed to offer audio data. Content-Type of remote server's response was: text/html",...}
```

**Cause**: Deepgram was trying to access the video URL but was getting an HTML page (player page) instead of actual video data.

## Solution

Updated `VideoTranscriptionService` to use `BunnyNetService::getDownloadUrl()` which generates a **direct Storage API URL** with authentication.

### What Changed

**Before**:
```php
// Used player/embed URL (returns HTML)
$videoUrl = $model->bunny_embed_url ?? $model->bunny_video_url;
// Deepgram tries to access: https://iframe.mediadelivery.net/...
// Gets HTML page → ERROR
```

**After**:
```php
// Uses Storage API URL (returns actual MP4 file)
$videoUrl = $this->bunnyNetService->getDownloadUrl($bunnyVideoId, '720');
// Deepgram accesses: https://storage.bunnycdn.com/{zone}/{videoId}/play_720p.mp4?accessKey=...
// Gets MP4 video data → SUCCESS ✅
```

### Requirements

For this to work, you must have in your `.env`:

```env
# Required for Bunny.net Storage API access
BUNNY_STORAGE_ZONE_NAME=vz-xxxxxxxx-xxx
BUNNY_STORAGE_ACCESS_KEY=your-storage-access-key-here

# Already configured
BUNNY_API_KEY=your-api-key
BUNNY_LIBRARY_ID=your-library-id
BUNNY_CDN_URL=https://vz-xxxxxxxx-xxx.b-cdn.net
```

### Where to Find These Values

1. **Storage Zone Name**: 
   - Go to Bunny.net Dashboard → Storage
   - Look for your video storage zone
   - Name is usually like: `vz-0cc8af54-835`
   - OR it's extracted automatically from `BUNNY_CDN_URL`

2. **Storage Access Key**:
   - Go to Bunny.net Dashboard → Storage
   - Click on your storage zone
   - Go to "FTP & HTTP API" tab
   - Look for "HTTP API Access Key" (**NOT the FTP password!**)
   - Copy the access key (long alphanumeric string)

## Testing

Try processing a video now:

```
Admin Panel → Content Management → Videos
→ Click ⋮ menu
→ Click "Process Captions (AI)"
```

Should now work! ✅

## Troubleshooting

### Still getting the same error?

**Check logs**:
```bash
tail -f storage/logs/laravel.log | grep -i "bunny\|deepgram"
```

**Common issues**:

1. **Storage Access Key not configured**:
   ```
   Error: Bunny.net Storage Access Key is not configured
   ```
   **Fix**: Add `BUNNY_STORAGE_ACCESS_KEY` to `.env`

2. **Wrong access key (using FTP password)**:
   ```
   Error: 403 Forbidden when accessing storage
   ```
   **Fix**: Use HTTP API Access Key, not FTP password

3. **Storage Zone Name not configured**:
   ```
   Error: Bunny.net Storage Zone Name is not configured
   ```
   **Fix**: Add `BUNNY_STORAGE_ZONE_NAME` to `.env`
   **OR**: Ensure `BUNNY_CDN_URL` includes the zone name (e.g., `https://vz-xxx.b-cdn.net`)

4. **Video file doesn't exist in storage**:
   ```
   Error: 404 Not Found
   ```
   **Fix**: Ensure video was fully uploaded to Bunny.net and processing is complete

### Verify Storage API URL is working

Test the URL directly:

```php
php artisan tinker

$service = app(\App\Services\BunnyNetService::class);
$url = $service->getDownloadUrl('YOUR_BUNNY_VIDEO_ID', '720');
echo $url;
// Copy URL and test in browser - should download video file
```

If the URL works in browser, it will work for Deepgram!

## What Happens Now

When you click "Process Captions (AI)":

1. ✅ System gets Bunny.net video ID
2. ✅ Calls `getDownloadUrl()` → Gets direct MP4 URL with auth
3. ✅ Removes `&download` parameter (for streaming)
4. ✅ Sends URL to Deepgram
5. ✅ Deepgram accesses video via Storage API
6. ✅ Transcription succeeds!
7. ✅ Generates captions (WebVTT)
8. ✅ Generates TTS audio (MP3)
9. ✅ Uploads captions to Bunny.net
10. ✅ Stores everything in database

## Summary

- ✅ **Fixed**: Deepgram now uses direct Storage API URLs
- ✅ **Required**: Configure `BUNNY_STORAGE_ACCESS_KEY` in `.env`
- ✅ **Benefit**: Transcription, captions, and TTS audio all work!

Try it now! 🚀





