# Bunny.net Video Features Implementation Guide

## Overview
This document explains the implementation of three key features for Bunny.net videos:
1. **Video Download from Bunny.net Embedded URL**
2. **Audio Language Selection**
3. **Closed Captions (CC) Button for Multilingual Transcription**

## 1. Video Download from Bunny.net

### Requirements
- **MP4 Fallback must be enabled** in your Bunny.net video library settings
- Video must have `allow_download = true` in the database
- User must have access to the video

### Implementation

#### Backend
- **New Endpoint**: `GET /api/videos/{video}/download-url?quality=720`
- **Service Method**: `BunnyNetService::getDownloadUrl($videoId, $quality)`
- Returns MP4 URL in format: `https://{cdn_url}/{video_id}/play_{quality}p.mp4`

#### Frontend
- Updated `handleDownloadMaterials()` to detect Bunny.net videos
- Fetches download URL from API endpoint
- Triggers download using anchor element

### Usage
1. Enable MP4 Fallback in Bunny.net dashboard:
   - Go to Video Library → Settings
   - Enable "MP4 Fallback" option
2. Set `allow_download = true` for videos in admin panel
3. Users can download videos via "DOWNLOAD MATERIALS" button

## 2. Audio Language Selection

### Requirements
- Video must have multiple audio tracks uploaded to Bunny.net
- Bunny.net API must return audio track information

### Implementation

#### Backend
- **New Endpoint**: `GET /api/videos/{video}/audio-tracks`
- **Service Method**: `BunnyNetService::getAudioTracks($videoId)`
- Returns array of available audio tracks with language info

#### Frontend (To Be Implemented)
- Add audio language selector dropdown
- Use Player.js API to switch audio tracks
- Store selected language in user preferences

### Usage
1. Upload videos with multiple audio tracks to Bunny.net
2. Bunny.net will automatically detect available tracks
3. Users can select preferred audio language from dropdown

## 3. Closed Captions (CC) for Multilingual Transcription

### Requirements
- Transcriptions stored in database (multilingual)
- WebVTT format for subtitles

### Implementation

#### Database Migration
- Added `transcription`, `transcription_en`, `transcription_es`, `transcription_pt` fields to `videos` table
- Run: `php artisan migrate`

#### Backend
- **New Endpoints**:
  - `GET /api/videos/{video}/subtitles?locale=en` - Get subtitle info
  - `GET /api/videos/{video}/subtitles/{locale}` - Get WebVTT file
- **Methods**:
  - `VideoController::getSubtitles()` - Returns transcription and WebVTT URL
  - `VideoController::getSubtitleVtt()` - Serves WebVTT file
  - `VideoController::convertTranscriptionToWebVTT()` - Converts text to WebVTT

#### Frontend (To Be Implemented)
- Add CC button to video player controls
- Load WebVTT subtitles based on user's locale
- Integrate with Player.js or native video element for subtitle display

### Usage
1. Add transcriptions in admin panel (multilingual support)
2. Transcriptions are automatically converted to WebVTT format
3. CC button appears in video player when subtitles are available
4. Users can toggle subtitles on/off

## Next Steps

### For Audio Language Selection:
1. Add UI dropdown in video player
2. Implement Player.js audio track switching
3. Store user preference

### For CC Button:
1. Add CC button to video player controls
2. Load WebVTT file when CC is enabled
3. Display subtitles synchronized with video playback

## Notes

- **MP4 Fallback**: Required for downloads. Enable in Bunny.net dashboard.
- **Transcriptions**: Can be added manually or via Bunny.net Transcribe AI
- **WebVTT Format**: Standard format for web video subtitles
- **Player.js**: Used for Bunny.net iframe control, supports subtitles

## Testing

1. **Download**: Test with `allow_download = true` and MP4 Fallback enabled
2. **Audio**: Test with videos that have multiple audio tracks
3. **CC**: Test with videos that have transcriptions in database

