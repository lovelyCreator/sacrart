# Caption Processing Troubleshooting Guide

## Issue Analysis

Based on the logs and testing, here's what's happening:

### 1. Storage Zone Mismatch ❌
- **Current config**: `vz-0cc8af54-835`
- **Correct zone**: `vz-550816` (based on library ID `550816`)
- **Fix**: The system now auto-detects the correct storage zone from library ID

### 2. No Caption Files in Bunny.net Storage ❌
- The video `fab28cdb-0191-4d19-8817-5866713bd00b` has no caption files uploaded
- Bunny.net API returns empty captions array: `"captions_count":0`
- All storage API requests return 404 (file not found)

## Solutions Implemented

### ✅ 1. Fixed Storage Zone Detection
Updated `BunnyNetService` and `VideoTranscriptionService` to:
- Auto-detect storage zone as `vz-{library_id}`
- Fallback to configured zone if available
- Extract from CDN URL as last resort

### ✅ 2. Enhanced Error Handling
- Better error messages explaining the issue
- Detailed logging for debugging
- Clear instructions for users

### ✅ 3. Added Caption Download Feature
- New API endpoints for both reels and live-archive videos
- Frontend UI with download buttons
- Direct download links to Bunny.net storage

## How to Fix the Current Issue

### Option 1: Upload Caption Files to Bunny.net (Recommended)

1. **Go to Bunny.net Dashboard**
2. **Navigate to Video Library** → Library `550816`
3. **Find video** `fab28cdb-0191-4d19-8817-5866713bd00b`
4. **Upload caption files** in the correct format:
   - `EN.vtt` (English)
   - `ES.vtt` (Spanish)  
   - `PT.vtt` (Portuguese)
5. **Place files in**: `/captions/` folder within the video directory

### Option 2: Use Bunny.net's Built-in Transcription

1. **Enable auto-transcription** in Bunny.net dashboard
2. **Process the video** to generate captions automatically
3. **Download and re-upload** in the correct format if needed

### Option 3: Generate Captions Manually

1. **Create VTT files** using transcription tools
2. **Upload to Bunny.net storage** at:
   ```
   https://storage.bunnycdn.com/vz-550816/{video_id}/captions/
   ```
3. **Use the correct naming**: `EN.vtt`, `ES.vtt`, `PT.vtt`

## Testing the Fix

### 1. Test Storage Zone Detection
```bash
php test_caption_urls.php
```

### 2. Test Video Data Fetching
```bash
php test_bunny_video.php
```

### 3. Test Caption Processing
1. Upload caption files to Bunny.net
2. Click "Process Captions (AI)" in admin panel
3. Check if captions are downloaded successfully

## Expected URLs After Fix

With the correct storage zone (`vz-550816`), caption URLs should be:

```
https://storage.bunnycdn.com/vz-550816/fab28cdb-0191-4d19-8817-5866713bd00b/captions/EN.vtt?accessKey=...
https://storage.bunnycdn.com/vz-550816/fab28cdb-0191-4d19-8817-5866713bd00b/captions/ES.vtt?accessKey=...
https://storage.bunnycdn.com/vz-550816/fab28cdb-0191-4d19-8817-5866713bd00b/captions/PT.vtt?accessKey=...
```

## Environment Configuration

The system now auto-detects the storage zone, but you can also update your `.env`:

```env
# Current (will be auto-detected)
BUNNY_LIBRARY_ID=550816
BUNNY_CDN_URL=vz-0cc8af54-835.b-cdn.net

# Optional explicit setting
BUNNY_STORAGE_ZONE_NAME=vz-550816
```

## API Endpoints Added

### For Reels
- `POST /api/admin/reels/{id}/process-transcription` - Process captions
- `GET /api/admin/reels/{reel}/caption-urls` - Get download URLs

### For Live Archive Videos  
- `POST /api/admin/live-archive-videos/{id}/process-transcription` - Process captions
- `GET /api/admin/live-archive-videos/{id}/caption-urls` - Get download URLs

## Frontend Features Added

### Reels Management
- New "Captions" column in table
- "Get Caption URLs" button in dropdown
- Individual download buttons for each language
- Visual indicators for available captions

### Live Archive Management
- Same features as reels (to be implemented in UI)

## Next Steps

1. **Upload caption files** to Bunny.net for the test video
2. **Test the caption processing** in admin panel
3. **Verify download functionality** works correctly
4. **Apply same UI changes** to live archive video management if needed

The system is now properly configured and should work once caption files are available in Bunny.net storage.