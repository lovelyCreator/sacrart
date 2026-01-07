# 🧪 Complete Testing Guide - Multi-Language Video System

## 🎯 What to Test

You now have a complete multi-language video system with:
1. ✅ **Captions in Bunny.net player** (CC button)
2. ✅ **Full transcription tab** (text view)
3. ✅ **Multi-language audio dubbing** (EN, ES, PT)
4. ✅ **Automatic language detection** (from URL)

---

## 📋 Step-by-Step Testing

### ✅ Step 1: Process a Video (Admin)

1. **Open admin panel:**
   ```
   http://your-domain.com/admin/videos
   ```

2. **Click ⋮ menu** on any video

3. **Click "Process Captions (AI)"**

4. **Confirm the dialog** (mentions EN, ES, PT)

5. **Wait 2-5 minutes** for processing

6. **Check for success message:**
   ```
   "Transcription and captions processed successfully!"
   ```

---

### ✅ Step 2: Test Captions in Bunny.net Player

#### A. Desktop Testing

1. **Go to video page:**
   ```
   http://your-domain.com/en/rewind/{id}
   ```

2. **Look at video player** (should be Bunny.net iframe)

3. **Find CC button** in player controls (bottom right corner)
   - Looks like: [CC] or [⊏⊐]
   - Usually near volume/settings buttons

4. **Click CC button**
   - Captions should appear overlaid on video!
   - Synchronized with video playback

5. **Test caption toggle:**
   - Click CC again → Captions hide
   - Click CC again → Captions show

#### B. Language Testing

1. **Test English captions:**
   ```
   http://your-domain.com/en/rewind/{id}
   ```
   - Enable CC → Should show English captions

2. **Test Spanish captions:**
   ```
   http://your-domain.com/es/rewind/{id}
   ```
   - Enable CC → Should show Spanish captions

3. **Test Portuguese captions:**
   ```
   http://your-domain.com/pt/rewind/{id}
   ```
   - Enable CC → Should show Portuguese captions

---

### ✅ Step 3: Test Transcription Tab

1. **On video page,** scroll down (desktop) or look for tabs

2. **Click "Transcripción" tab**

3. **Check for info banner:**
   ```
   ┌──────────────────────────────────────────────┐
   │ 🔤 Captions available in video player        │
   │ Click the CC button to enable subtitles.     │
   │ Available: EN, ES, PT                        │
   └──────────────────────────────────────────────┘
   ```

4. **Read full transcription:**
   - Should show timestamped text
   - Format: `00:00 - Text here...`
   - Paragraphs separated by time

5. **Test language switching:**
   - Change URL: `/en/` → `/es/` → `/pt/`
   - Transcription text should change language

---

### ✅ Step 4: Test Multi-Language Audio Player

1. **Look below the video player** for:
   ```
   ┌────────────────────────────────────────┐
   │  🌍 Audio Language: English ▼          │
   │     ├─ English (Original)              │
   │     ├─ Español (Dubbed)                │
   │     └─ Português (Dubbed)              │
   │  ▶️ Play    🔊 ▬▬▬▬▬▬▬ 75%           │
   └────────────────────────────────────────┘
   ```

2. **Select a language** from dropdown

3. **Click Play button** (▶️)

4. **Verify:**
   - ✅ Dubbed audio plays
   - ✅ Main video mutes automatically
   - ✅ Audio syncs with video
   - ✅ Volume slider works

5. **Test all languages:**
   - Select "English" → Play → Should hear English audio
   - Select "Español" → Play → Should hear Spanish audio
   - Select "Português" → Play → Should hear Portuguese audio

---

### ✅ Step 5: Test Mobile View

1. **Open on mobile device** or resize browser to mobile width

2. **Check video player:**
   - Should be responsive (fits screen)
   - CC button should be visible

3. **Test captions on mobile:**
   - Tap CC button → Captions appear
   - Should be readable on small screen

4. **Test transcription on mobile:**
   - Look for bottom sheet or modal button
   - Tap to open transcription
   - Should display nicely formatted

---

## 🔍 What to Check

### ✅ Captions (Bunny.net Player)

- [ ] CC button visible in player controls
- [ ] Clicking CC shows/hides captions
- [ ] Captions synchronized with video timing
- [ ] Captions change when URL language changes
- [ ] Captions readable (good font, contrast)
- [ ] Captions work on mobile

### ✅ Transcription Tab

- [ ] Tab labeled "Transcripción" visible
- [ ] Info banner shows when captions available
- [ ] Banner lists available languages (EN, ES, PT)
- [ ] Full text with timestamps displayed
- [ ] Text changes when URL language changes
- [ ] Formatting is clean and readable

### ✅ Multi-Language Audio

- [ ] Audio player appears below video
- [ ] Language dropdown shows 3 options
- [ ] Play/pause button works
- [ ] Volume slider adjusts volume
- [ ] Audio plays for all 3 languages
- [ ] Main video mutes when audio plays
- [ ] Audio syncs with video playback

### ✅ Language Switching

- [ ] `/en/` URL shows English content
- [ ] `/es/` URL shows Spanish content
- [ ] `/pt/` URL shows Portuguese content
- [ ] All 3 systems respect URL language:
  - Captions
  - Transcription
  - Audio (initial selection)

---

## 🐛 Troubleshooting

### Problem: CC button not visible
**Solution:**
- Check if video is Bunny.net hosted (not local file)
- Verify `caption_urls` in database is not empty
- Check browser console for errors

### Problem: Captions not showing
**Solution:**
- Click CC button to enable
- Verify captions were uploaded to Bunny.net
- Check Laravel logs for upload errors:
  ```bash
  tail -f storage/logs/laravel.log | grep -i "caption"
  ```

### Problem: Wrong language captions
**Solution:**
- Check URL locale (should be `/en/`, `/es/`, or `/pt/`)
- Clear browser cache
- Verify `caption_urls` has all languages in database

### Problem: No transcription in tab
**Solution:**
- Check database: `$video->transcriptions` should have data
- Verify API endpoint: `/api/videos/{id}/subtitles?locale=en`
- Check VideoController reads from JSON field (not old fields)

### Problem: Audio player not showing
**Solution:**
- Check `$video->audio_urls` in database (should have data)
- Verify TTS processing completed successfully
- Check Laravel logs for Deepgram TTS errors

### Problem: Audio not playing
**Solution:**
- Check audio URL is accessible (test in browser)
- Verify browser allows audio playback (user interaction required)
- Check browser console for CORS errors

---

## 📊 Expected Data in Database

After successful processing, check database:

```bash
php artisan tinker
```

```php
$video = \App\Models\Video::find(1); // Replace with your video ID

// Check transcriptions (JSON field)
dd($video->transcriptions);
// Expected: [
//   "en" => "English text...",
//   "es" => "Spanish text...",
//   "pt" => "Portuguese text..."
// ]

// Check caption URLs (JSON field)
dd($video->caption_urls);
// Expected: [
//   "en" => "https://vz-xxx.b-cdn.net/video-id/captions/en.vtt",
//   "es" => "https://vz-xxx.b-cdn.net/video-id/captions/es.vtt",
//   "pt" => "https://vz-xxx.b-cdn.net/video-id/captions/pt.vtt"
// ]

// Check audio URLs (JSON field)
dd($video->audio_urls);
// Expected: [
//   "en" => "https://storage.../audio_en.mp3",
//   "es" => "https://storage.../audio_es.mp3",
//   "pt" => "https://storage.../audio_pt.mp3"
// ]

// Check processing status
echo "Status: " . $video->transcription_status; // Should be: "completed"
echo "Source: " . $video->source_language; // Should be: "en"
echo "Processed: " . $video->transcription_processed_at; // Should have timestamp
```

---

## 🎯 Success Criteria

**System is working correctly if:**

✅ **Admin can process videos** with one click  
✅ **Captions appear in Bunny.net player** (CC button)  
✅ **Transcription displays in tab** with timestamps  
✅ **Multi-language audio player works** (3 languages)  
✅ **Language switching works** via URL  
✅ **All 3 languages available** (EN, ES, PT)  
✅ **Mobile experience is good** (responsive)  
✅ **No console errors** in browser  
✅ **No Laravel errors** in logs  

---

## 📸 Screenshot Checklist

Take screenshots of:
1. [ ] Admin panel - Processing dialog
2. [ ] Admin panel - Success message
3. [ ] Video page - CC button in player
4. [ ] Video page - Captions showing on video
5. [ ] Transcription tab - Info banner
6. [ ] Transcription tab - Full text
7. [ ] Audio player - Language dropdown
8. [ ] Audio player - Playing state
9. [ ] Mobile view - Player with CC
10. [ ] Mobile view - Transcription modal

---

## 🚀 Quick Test Script

**Copy and paste this checklist:**

```
□ 1. Process video in admin (wait 2-5 min)
□ 2. Go to video page (en/rewind/ID)
□ 3. See CC button in player
□ 4. Click CC - captions appear
□ 5. Click Transcripción tab
□ 6. See info banner (captions available)
□ 7. See full text with timestamps
□ 8. See audio player below video
□ 9. Select language from dropdown
□ 10. Click play - audio plays
□ 11. Change URL to /es/rewind/ID
□ 12. CC shows Spanish captions
□ 13. Transcription shows Spanish text
□ 14. Change URL to /pt/rewind/ID
□ 15. CC shows Portuguese captions
□ 16. Test on mobile - all features work
```

---

## 📚 Related Documentation

- **`CAPTION_SYNCHRONIZATION_COMPLETE.md`** - Technical details
- **`TRANSCRIPTION_FRONTEND_FIX.md`** - API fixes
- **`READY_TO_USE.md`** - Quick start guide
- **`IMPLEMENTATION_COMPLETE.md`** - Full system docs
- **`ADMIN_PANEL_FIX.md`** - Admin errors fixed

---

## 💡 Tips for Best Results

1. **Use videos with clear speech** - Better transcription accuracy
2. **Process short videos first** - Faster testing (30 sec - 2 min)
3. **Test in Chrome/Safari** - Best Bunny.net player support
4. **Check mobile AND desktop** - Different UX on each
5. **Verify all 3 languages** - Don't just test English
6. **Check Laravel logs** - Look for errors during processing
7. **Clear browser cache** - If captions don't update

---

## ✅ Final Checklist

Before reporting success:

- [ ] Processed at least one video successfully
- [ ] Tested captions in Bunny.net player (CC button)
- [ ] Tested transcription tab display
- [ ] Tested audio player (all 3 languages)
- [ ] Tested language switching (URL changes)
- [ ] Tested on desktop browser
- [ ] Tested on mobile device
- [ ] No errors in browser console
- [ ] No errors in Laravel logs
- [ ] All features working as expected

---

**Created:** January 7, 2026  
**Status:** ✅ READY FOR TESTING  
**Estimated time:** 15-20 minutes for complete test

🎉 **Happy testing!** Let me know if you find any issues! 🧪


