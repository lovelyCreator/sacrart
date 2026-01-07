# 🎙️ Multi-Language Audio Player Guide

## 🎯 What It Does

The **Multi-Language Audio Player** allows users to:
1. ✅ Play dubbed audio in multiple languages (EN, ES, PT)
2. ✅ Switch between languages manually using dropdown
3. ✅ Auto-sync audio language with page language
4. ✅ Keep playing when switching languages

---

## 📍 Where It Appears

The audio player shows **below the video** on:
- `/en/video/17` - Episode Detail page
- `/en/reel/1` - Reel Detail page
- `/en/rewind/1` - Rewind Episodes page

**Visual appearance:**
```
┌─────────────────────────────────────────┐
│ 🔊 Audio Dubbing                        │
├─────────────────────────────────────────┤
│ [▶️] [🌐 English ▼] [🎙️ AI Dubbed]     │
└─────────────────────────────────────────┘
```

---

## 🔍 Checking If Audio Player Works

### Step 1: Check if video has audio URLs

**Run this test:**
```bash
php test_audio_data.php
```

**Expected output:**
```
✅ Found Video with audio_urls:
ID: 17
Title: Introduction to Laravel
Audio URLs:
Array (
    [en] => https://example.com/audio/en.mp3
    [es] => https://example.com/audio/es.mp3
    [pt] => https://example.com/audio/pt.mp3
)
```

**If you see "❌ No videos found with audio_urls":**
- Process a video in admin panel first
- Wait for transcription to complete (5-10 minutes)

---

### Step 2: Check browser console

**Open video page and check console (F12):**

```javascript
// Should see logs like:
MultiLanguageAudioPlayer mounted/updated: {
  audioTracks: [
    { lang: 'en', label: 'English' },
    { lang: 'es', label: 'Español' },
    { lang: 'pt', label: 'Português' }
  ],
  selectedLanguage: 'en',
  defaultLanguage: 'en',
  currentTrack: { lang: 'en', label: 'English' }
}
```

**If you don't see these logs:**
- Frontend might not be rebuilt: `cd frontend && npm run build`
- Video might not have audio_urls

---

### Step 3: Visual check

**Look for the audio player below the video:**

✅ **Should see:**
```
🔊 Audio Dubbing
[Play button] [Language dropdown] [AI Dubbed badge]
```

❌ **If NOT visible:**
- Check: Does video have `audio_urls` in database?
- Check: Is user logged in with access to video?
- Check: Browser console for errors

---

## 🎮 How to Use

### Manual Language Selection:

```
1. Click language dropdown (🌐 English ▼)
2. Menu shows:
   ┌──────────────────┐
   │ Audio Language   │
   ├──────────────────┤
   │ English     ✓    │
   │ Español          │
   │ Português        │
   ├──────────────────┤
   │ Volume: 100%     │
   │ [========>]       │
   └──────────────────┘

3. Click Español
4. Audio switches to Spanish
5. Keeps playing from same position ✅
```

---

### Auto Language Sync:

```
1. Open: /en/video/17
   → Audio player shows: 🌐 English

2. Change page language: EN → ES
   → URL changes to /es/video/17
   → Audio player updates to: 🌐 Español ✅

3. Change to Portuguese: ES → PT  
   → URL changes to /pt/video/17
   → Audio player updates to: 🌐 Português ✅
```

---

## 🔧 Troubleshooting

### Problem: Audio player doesn't appear

**Check 1: Does video have audio?**
```bash
php test_audio_data.php
```

**Check 2: Frontend rebuilt?**
```bash
cd frontend
npm run build
```

**Check 3: Browser console**
```javascript
// Look for warning:
"MultiLanguageAudioPlayer: No tracks available"
```

---

### Problem: Can't change language

**Check console for:**
```javascript
// Should see when clicking dropdown:
"User changed audio language to: es"
"Switching audio: {from: 'en', to: 'es', currentTime: 10.5, wasPlaying: true}"
```

**If no logs:**
- Frontend not rebuilt
- JavaScript error (check console)

---

### Problem: Audio doesn't play

**Check console for:**
```javascript
// Should see:
"Audio play error: [error details]"
```

**Common causes:**
- Audio URL is invalid or 404
- Browser autoplay blocked
- Audio file format not supported

**Test audio URL directly:**
```bash
php artisan tinker
```
```php
$video = \App\Models\Video::find(17);
echo $video->audio_urls['en'];
// Copy URL and open in browser - should download/play audio
```

---

### Problem: Language doesn't auto-sync

**Check iframe key:**
```javascript
const audioContainer = document.querySelector('[key^="audio-player"]');
console.log('Audio container key:', audioContainer?.getAttribute('key'));
// Should include language code: audio-player-17-es
```

**If key doesn't change when switching languages:**
- Frontend not rebuilt
- Clear browser cache: Ctrl + Shift + R

---

## 📊 How Auto-Sync Works

```
User changes page language:
  /en/video/17 → /es/video/17

1. React detects locale change
   locale = 'es'

2. Audio container key changes
   key="audio-player-17-en" → key="audio-player-17-es"

3. React remounts component
   (Destroys old, creates new)

4. New component gets new defaultLanguage prop
   defaultLanguage = 'es'

5. useEffect triggers
   setSelectedLanguage('es')

6. Audio element updates
   src changes to Spanish audio URL

7. Audio loads in Spanish! ✅
```

---

## 🎯 Testing Checklist

- [ ] Run: `php test_audio_data.php` - Check audio URLs exist
- [ ] Run: `cd frontend && npm run build` - Rebuild frontend
- [ ] Open: `/en/video/17` - Check audio player appears
- [ ] Check: Browser console shows player logs
- [ ] Test: Click play button - Audio plays
- [ ] Test: Click language dropdown - Shows 3 languages
- [ ] Test: Select Español - Audio switches to Spanish
- [ ] Test: Change page to /es/video/17 - Audio auto-switches
- [ ] Test: Volume slider works

---

## 🎨 Customization

### Changing Labels:

**File:** `frontend/src/pages/EpisodeDetail.tsx` (line 1871)

```typescript
audioTracks={Object.entries(video.audio_urls).map(([lang, url]) => ({
  language: lang,
  url: url as string,
  label: lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Português'
  // Change labels here ↑
}))}
```

### Changing Appearance:

**File:** `frontend/src/components/MultiLanguageAudioPlayer.tsx`

```typescript
// Colors (line 157):
className="w-full bg-gradient-to-r from-[#A05245]/10 to-[#C5A065]/10"

// Title (line 158):
<h3>Audio Dubbing</h3>

// Button style (line 171):
className="w-12 h-12 rounded-full bg-[#A05245]"
```

---

## 📚 Related Files

**Backend:**
- `app/Services/DeepgramService.php` - TTS generation
- `app/Services/VideoTranscriptionService.php` - Audio generation

**Frontend:**
- `frontend/src/components/MultiLanguageAudioPlayer.tsx` - Player component
- `frontend/src/pages/EpisodeDetail.tsx` - Episode page
- `frontend/src/pages/ReelDetail.tsx` - Reel page
- `frontend/src/pages/RewindEpisodes.tsx` - Rewind page

**Database:**
- `videos.audio_urls` - JSON field with audio URLs
- `reels.audio_urls` - JSON field with audio URLs

---

## ✅ Success Criteria

**Audio player is working correctly when:**

- ✅ Player appears below video
- ✅ Shows current language
- ✅ Dropdown shows 3 languages
- ✅ Can manually switch languages
- ✅ Audio keeps playing when switching
- ✅ Auto-syncs with page language
- ✅ Volume control works
- ✅ Play/pause works

---

## 🐛 Common Issues

### Issue: "Cannot control audio language"

**Symptoms:**
- Player appears but language doesn't change
- Dropdown doesn't work

**Solution:**
1. Rebuild frontend: `npm run build`
2. Hard refresh: Ctrl + Shift + R
3. Check console for JavaScript errors

---

### Issue: "Player doesn't appear"

**Symptoms:**
- No audio player visible below video

**Possible causes:**
1. Video doesn't have `audio_urls`
2. User doesn't have access
3. Frontend not rebuilt

**Solution:**
```bash
# Check database
php test_audio_data.php

# Rebuild frontend
cd frontend && npm run build

# Process video if needed
# Admin → Videos → ⋮ → Process Captions (AI)
```

---

**Created:** January 7, 2026  
**Status:** ✅ Implemented  
**Action Required:** 
1. Rebuild frontend
2. Test audio player
3. Check console logs

🎙️ **Audio dubbing with language control is fully implemented!**

