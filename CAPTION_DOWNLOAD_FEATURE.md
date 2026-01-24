# Caption Download Feature for Reels

## Overview

The caption download feature allows administrators to download caption files (VTT/SRT) directly from Bunny.net storage for reels that have been processed with AI transcription.

## How It Works

### 1. Process Captions (AI)
- Click the "Process Captions (AI)" button in the reel actions dropdown
- This downloads existing captions from Bunny.net and processes them for multiple languages (EN, ES, PT)
- The system stores caption URLs in the database for future access

### 2. Get Caption URLs
- After processing, click "Get Caption URLs" to generate download links
- This creates direct download URLs to the Bunny.net storage files
- URLs are generated for all available languages

### 3. Download Captions
- Once URLs are generated, you'll see download options for each language
- Click on any language (e.g., "EN (VTT)", "ES (VTT)") to download the caption file
- Files are downloaded directly from Bunny.net storage

## Caption URL Format

The system generates URLs in this format:
```
https://storage.bunnycdn.com/{storage_zone_name}/{video_id}/captions/{LANGUAGE}.vtt?accessKey={access_key}
```

Example:
```
https://storage.bunnycdn.com/vz-0cc8af54-835/f70e8def-51c2-4998-84e4-090a30bc3fc6/captions/ES.vtt?accessKey=9319e8d4-bab2-4f60-a66dabae1a18-8cf4-4d5f
```

## Supported Languages

- **EN** - English
- **ES** - Spanish  
- **PT** - Portuguese

## File Formats

The system supports both:
- **VTT** (WebVTT) - Primary format
- **SRT** (SubRip) - Alternative format

## UI Features

### Table Column
- New "Captions" column shows available caption languages
- Displays badges for each available language (EN, ES, PT)
- Shows "Available" badge if captions exist but URLs haven't been generated yet

### Dropdown Menu
- **Process Captions (AI)** - Downloads and processes captions from Bunny.net
- **Get Caption URLs** - Generates download URLs for available captions
- **Download options** - Individual download links for each language

## API Endpoints

### Process Transcription
```
POST /api/admin/reels/{id}/process-transcription
```

### Get Caption URLs
```
GET /api/admin/reels/{reel}/caption-urls
```

Response:
```json
{
  "success": true,
  "data": {
    "reel_id": 123,
    "bunny_video_id": "f70e8def-51c2-4998-84e4-090a30bc3fc6",
    "caption_urls": {
      "en": {
        "url": "https://storage.bunnycdn.com/.../EN.vtt?accessKey=...",
        "filename": "EN.vtt",
        "format": "vtt",
        "language": "en",
        "language_code": "EN"
      },
      "es": {
        "url": "https://storage.bunnycdn.com/.../ES.vtt?accessKey=...",
        "filename": "ES.vtt", 
        "format": "vtt",
        "language": "es",
        "language_code": "ES"
      }
    }
  }
}
```

## Configuration Requirements

Make sure these environment variables are set in your `.env` file:

```env
BUNNY_STORAGE_ZONE_NAME=your-storage-zone
BUNNY_STORAGE_ACCESS_KEY=your-access-key
BUNNY_CDN_URL=https://your-zone.b-cdn.net
```

## Workflow

1. **Upload Video to Bunny.net** - Ensure your reel has a valid `bunny_video_id` or `bunny_embed_url`
2. **Upload Captions to Bunny.net** - Use Bunny.net dashboard to upload caption files (EN.vtt, ES.vtt, PT.vtt)
3. **Process Captions** - Click "Process Captions (AI)" in the admin panel
4. **Generate URLs** - Click "Get Caption URLs" to create download links
5. **Download** - Click individual language options to download caption files

## Troubleshooting

### No Captions Found
- Ensure caption files are uploaded to Bunny.net storage in the correct path: `{video_id}/captions/`
- Check that files are named correctly: `EN.vtt`, `ES.vtt`, `PT.vtt` (uppercase)
- Verify storage zone and access key configuration

### Download Fails
- Check that the access key has proper permissions for the storage zone
- Ensure the caption files exist in Bunny.net storage
- Verify the video ID is correct

### Missing Languages
- The system tries multiple filename variations (EN.vtt, en.vtt, EN.srt, en.srt)
- Upload caption files with uppercase language codes for best compatibility
- Check Laravel logs for detailed error information

## Benefits

- **Direct Access** - Download caption files without going through Bunny.net dashboard
- **Batch Processing** - Process multiple languages at once
- **Integration** - Seamlessly integrated into the existing admin interface
- **Flexibility** - Supports both VTT and SRT formats
- **Efficiency** - Cached URLs for quick access