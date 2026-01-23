# HLS Audio Track Control Test Files

This directory contains test files to test HLS player audio track control alongside the existing Bunny.net iframe player.

## Files

1. **`test_hls_audio_track.html`** - Standalone HLS.js player test page
2. **`test_hls_audio_track_api.php`** - PHP API endpoint to generate HLS URLs
3. **`test_hls_integration.html`** - Side-by-side comparison of iframe vs HLS.js players

## Usage

### Option 1: Standalone HLS Player Test

1. Open `test_hls_audio_track.html` in your browser
2. Enter your HLS URL (e.g., `https://vz-0cc8af54-835.b-cdn.net/{videoId}/playlist.m3u8`)
3. Click "Load Video"
4. The page will display all available audio tracks
5. Click on any track to switch audio languages

**Or use query string:**
```
test_hls_audio_track.html?url=https://vz-0cc8af54-835.b-cdn.net/{videoId}/playlist.m3u8
```

### Option 2: Integration Test (Iframe + HLS Comparison)

1. Make sure `test_hls_audio_track_api.php` is accessible via your web server
2. Open `test_hls_integration.html` in your browser
3. Enter your Bunny.net video ID (e.g., `f70e8def-51c2-4998-84e4-090a30bc3fc6`)
4. Select default language (EN, ES, PT)
5. Click "Load Both Players"
6. Compare audio track switching between iframe player and HLS.js player

**Or use query string:**
```
test_hls_integration.html?video_id=f70e8def-51c2-4998-84e4-090a30bc3fc6&language=es
```

### Option 3: Using the API Endpoint

The PHP API endpoint can be used to get HLS URLs programmatically:

```bash
# Get HLS URL for a video
curl "http://localhost:8000/test_hls_audio_track_api.php?video_id=f70e8def-51c2-4998-84e4-090a30bc3fc6&language=es"
```

Response:
```json
{
    "success": true,
    "video_id": "f70e8def-51c2-4998-84e4-090a30bc3fc6",
    "language": "es",
    "hls_url": "https://vz-0cc8af54-835.b-cdn.net/f70e8def-51c2-4998-84e4-090a30bc3fc6/playlist.m3u8?token=...",
    "audio_tracks": [
        {"id": 0, "name": "English", "lang": "en", "groupId": "default"},
        {"id": 1, "name": "Spanish", "lang": "es", "groupId": "default"},
        {"id": 2, "name": "Portuguese", "lang": "pt", "groupId": "default"}
    ],
    "default_audio_track": "es"
}
```

## Features

### HLS.js Player Features:
- ✅ Load HLS playlists (.m3u8)
- ✅ Display all available audio tracks
- ✅ Switch audio tracks programmatically
- ✅ Real-time track information
- ✅ Error handling and recovery
- ✅ Works in all modern browsers (uses native HLS in Safari)

### Iframe Player Features (kept intact):
- ✅ Bunny.net iframe player
- ✅ URL parameter-based audio track selection (`defaultAudioTrack`)
- ✅ Player.js API for runtime switching
- ✅ Fallback to URL reload if API unavailable

## How HLS Audio Track Control Works

1. **HLS Manifest**: The `.m3u8` playlist file contains information about all available audio tracks
2. **Track Selection**: HLS.js exposes an API to switch between tracks:
   ```javascript
   hls.audioTrack = 0; // Switch to first track (English)
   hls.audioTrack = 1; // Switch to second track (Spanish)
   ```
3. **Track Information**: Each track has:
   - `name`: Display name
   - `lang`: Language code (en, es, pt)
   - `groupId`: Track group identifier
   - `id`: Track index

## Browser Compatibility

- **Chrome/Edge/Firefox**: Uses HLS.js library
- **Safari**: Uses native HLS support (limited API)
- **Mobile**: Works on iOS Safari and Chrome Android

## Notes

- The iframe player implementation is **NOT removed** - both players can coexist
- HLS.js provides more programmatic control over audio tracks
- Iframe player is simpler but relies on Bunny.net's player implementation
- Both methods can be used depending on your needs

## Testing Checklist

- [ ] Load video with HLS URL
- [ ] Verify all audio tracks are detected
- [ ] Switch between audio tracks
- [ ] Verify audio changes immediately
- [ ] Test with different languages (EN, ES, PT)
- [ ] Compare iframe vs HLS.js behavior
- [ ] Test on different browsers
- [ ] Test with token authentication (if enabled)

## Next Steps

If HLS.js works well for your use case, you can:
1. Integrate HLS.js into your React components
2. Create a custom video player component using HLS.js
3. Keep iframe as fallback for simpler cases
4. Use HLS.js for advanced audio track control
