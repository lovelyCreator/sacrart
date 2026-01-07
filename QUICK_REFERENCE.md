# Quick Reference - Deepgram Caption Processing

## ⚡ Quick Start

### 1. Setup (One Time)
```bash
# Add to .env
DEEPGRAM_API_KEY=your_api_key_here

# Run migrations
php artisan migrate

# Clear config cache
php artisan config:clear
```

### 2. Process Captions (Per Video)
```
Admin Panel → Content Management → Videos
→ Click ⋮ menu
→ Click "Process Captions (AI)"
→ Wait 1-5 minutes
→ Done!
```

### 3. Verify
```
1. Check notification: "Success" appears
2. Test in frontend: CC button shows languages
3. Switch languages: Captions appear correctly
```

---

## 📋 Command Cheat Sheet

### Check Status
```sql
SELECT id, title, transcription_status, 
       JSON_KEYS(transcriptions) as languages
FROM videos 
WHERE transcription_status = 'completed';
```

### Reset Failed Video
```sql
UPDATE videos 
SET transcription_status = 'pending', 
    transcription_error = NULL 
WHERE id = YOUR_VIDEO_ID;
```

### Batch Process (Tinker)
```php
php artisan tinker

$service = app(\App\Services\VideoTranscriptionService::class);
$video = \App\Models\Video::find(YOUR_VIDEO_ID);
$service->processVideoTranscription($video, ['en','es','pt'], 'en');
```

### View Logs
```bash
# Real-time logs
tail -f storage/logs/laravel.log | grep -i deepgram

# Last 50 lines
tail -50 storage/logs/laravel.log | grep -i transcription
```

---

## 🔧 API Endpoints

```
POST   /api/admin/videos/{id}/process-transcription
       Body: {
         "languages": ["en","es","pt"],
         "source_language": "en"
       }

GET    /api/admin/videos/{id}/transcription-status
       Returns: {
         "status": "completed",
         "languages": ["en","es","pt"],
         "caption_urls": {...}
       }

POST   /api/admin/videos/{id}/reprocess-language
       Body: {
         "language": "es",
         "source_language": "en"
       }
```

---

## 💡 Common Issues & Fixes

| Issue | Quick Fix |
|-------|-----------|
| "API key not configured" | Add `DEEPGRAM_API_KEY` to `.env`, run `php artisan config:clear` |
| "No video URL found" | Ensure video has `bunny_embed_url` or `bunny_video_url` |
| Processing stuck | Check logs, reset status to 'pending', try again |
| Captions not showing | Verify in Bunny.net dashboard, check browser console |
| Poor quality | Use better audio source, check microphone quality |

---

## 📊 Database Fields

```php
transcriptions          // JSON - Full transcription data
caption_urls           // JSON - Bunny.net caption URLs
source_language        // VARCHAR - Original language
transcription_status   // ENUM - pending/processing/completed/failed
transcription_error    // TEXT - Error message
transcription_processed_at // TIMESTAMP - When completed
```

---

## 💰 Cost Calculator

```
Cost per minute: $0.0125

5 min video   = $0.06
15 min video  = $0.19
30 min video  = $0.38
60 min video  = $0.75

100 videos × 15 min = $18.75
```

Free tier: **$200 credit** (~16,000 minutes)

---

## 🎯 Testing Checklist

```
□ Add DEEPGRAM_API_KEY to .env
□ Run php artisan migrate
□ Test with 1 short video (2-3 min)
□ Verify success notification
□ Check database (transcription_status = completed)
□ Check Bunny.net dashboard (captions uploaded)
□ Test in frontend (CC button works)
□ Switch between languages (all work)
□ Test with longer video (30+ min)
□ Test error handling (invalid video)
```

---

## 📁 Files Reference

### Backend
```
app/Services/
├─ DeepgramService.php           (NEW)
├─ VideoTranscriptionService.php (NEW)
├─ BunnyNetService.php           (MODIFIED)
└─ GoogleTranslateService.php    (EXISTING)

app/Http/Controllers/Api/
└─ VideoController.php           (MODIFIED)

database/migrations/
├─ *_add_captions_to_videos.php  (NEW)
├─ *_add_captions_to_reels.php   (NEW)
└─ *_add_captions_to_rewinds.php (NEW)

config/
└─ services.php                  (MODIFIED)

routes/
└─ api.php                       (MODIFIED)
```

### Frontend
```
frontend/src/
├─ services/videoApi.ts                    (MODIFIED)
└─ pages/admin/ContentManagement.tsx       (MODIFIED)
```

### Documentation
```
DEEPGRAM_TRANSCRIPTION_README.md  (Full documentation)
DEEPGRAM_SETUP_GUIDE.md           (Quick setup guide)
IMPLEMENTATION_SUMMARY.md         (Implementation details)
ADMIN_PANEL_GUIDE.md              (Admin guide)
QUICK_REFERENCE.md                (This file)
```

---

## 🌐 Supported Languages

### Current Implementation
- 🇺🇸 English (en)
- 🇪🇸 Spanish (es)
- 🇵🇹 Portuguese (pt)

### Deepgram Supports
30+ languages including:
French, German, Italian, Dutch, Russian, Japanese, Korean, Chinese, Arabic, and more!

To add: Modify `processVideoTranscription()` language array.

---

## 📞 Support Resources

| Resource | Link/Command |
|----------|--------------|
| Deepgram Docs | https://developers.deepgram.com/ |
| Bunny.net Docs | https://docs.bunny.net/ |
| Laravel Logs | `tail -f storage/logs/laravel.log` |
| Deepgram Console | https://console.deepgram.com |
| Bunny Dashboard | https://dash.bunny.net |

---

## 🚀 Performance Tips

### Speed Up Processing
1. Use shorter videos for testing
2. Enable queue system for async processing
3. Process during off-peak hours
4. Batch process overnight

### Optimize Costs
1. Only process videos that need captions
2. Don't reprocess unnecessarily
3. Monitor Deepgram usage dashboard
4. Use batch processing to minimize API calls

### Improve Quality
1. Use high-quality audio source
2. Ensure clear speech (no mumbling)
3. Minimize background noise
4. Use proper microphone
5. Set correct source language

---

## 🔐 Security Notes

- ✅ API key in `.env` (never commit!)
- ✅ Admin-only endpoints
- ✅ Input validation
- ✅ Error messages sanitized
- ✅ Bunny.net captions are public (by design)

---

## 📈 Monitoring

### Check Processing Status
```php
// Via Tinker
$video = \App\Models\Video::find(ID);
echo "Status: {$video->transcription_status}\n";
echo "Processed: {$video->transcription_processed_at}\n";
echo "Error: {$video->transcription_error}\n";
echo "Languages: " . implode(', ', array_keys($video->transcriptions ?? []));
```

### Check Deepgram Usage
```
https://console.deepgram.com
→ Usage Dashboard
→ View minutes transcribed
→ View credits remaining
```

### Check Bunny.net Captions
```
https://dash.bunny.net
→ Stream
→ Video Library
→ Find Video
→ Edit
→ Captions Section
```

---

## 🎓 Advanced Usage

### Custom Languages
```php
$service->processVideoTranscription(
    $video, 
    ['en', 'fr', 'de', 'it'],  // Custom languages
    'en'                        // Source language
);
```

### Reprocess Single Language
```php
$service->reprocessLanguage($video, 'es', 'en');
```

### Check Status Programmatically
```php
$status = $service->getTranscriptionStatus($video);
if ($status['status'] === 'completed') {
    // Captions ready!
}
```

---

## ⚠️ Important Notes

1. **Processing Time**: Don't close browser during processing
2. **Concurrent**: Avoid processing same video twice
3. **Audio Quality**: Better audio = better captions
4. **Language**: Set correct source language
5. **Bunny.net ID**: Must have valid bunny_video_id
6. **Credits**: Monitor Deepgram usage to avoid surprises
7. **Cache**: Clear config cache after adding API key
8. **Logs**: Always check logs if something fails

---

## ✅ Success Indicators

Your implementation is working if:
- ✓ "Process Captions (AI)" button appears
- ✓ Processing completes without errors
- ✓ Success notification appears
- ✓ Database shows `completed` status
- ✓ Bunny.net shows 3 caption files
- ✓ CC button appears in player
- ✓ All 3 languages work
- ✓ Captions sync with video

---

## 🎉 Quick Win

**Test with this workflow (5 minutes)**:

```bash
# 1. Setup
echo "DEEPGRAM_API_KEY=your_key" >> .env
php artisan config:clear

# 2. Process
# Go to admin panel, click "Process Captions (AI)"

# 3. Verify
# Check database
php artisan tinker
>>> $v = \App\Models\Video::latest()->first()
>>> $v->transcription_status
=> "completed"

# 4. Test
# Open video in frontend, click CC button
# Captions should appear in 3 languages
```

**Done! 🎊**

---

**Version**: 1.0  
**Last Updated**: January 5, 2026  
**Status**: Production Ready ✅





