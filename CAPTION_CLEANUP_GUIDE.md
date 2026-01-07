# 🧹 Caption Cleanup Guide - Remove Duplicate Captions

## 🐛 The Problem

**Screenshot shows:** Caption menu has TOO MANY options:
- Disabled
- EN (EN-AUTO)
- ES (ES-AUTO)
- PT (PT-AUTO)
- English (EN)
- Español (ES)
- Português (PT)

**We need ONLY 4 options:**
- Disabled
- EN
- ES
- PT

---

## 🔍 Where Are Captions Stored?

**Captions are stored in Bunny.net's video library**, not in your database!

```
Your Database:
  videos.transcriptions → VTT file content ✅
  videos.caption_urls → URLs to caption files ✅

Bunny.net Video Library:
  Video → Captions → Multiple tracks can exist ❌
    - en (label: EN)
    - en (label: English) ← Duplicate!
    - en (label: EN-AUTO) ← Auto-generated!
```

**Problem:** Old captions aren't deleted when uploading new ones, causing duplicates!

---

## ✅ The Solution

### 1. Added Caption Deletion Methods

**File:** `app/Services/BunnyNetService.php`

**New methods:**
```php
// Delete a specific caption
deleteCaption($videoId, $language)

// Delete ALL captions from a video  
deleteAllCaptions($videoId)

// Upload with auto-delete
uploadCaptions($videoId, $content, $language, $label, $deleteExisting = true)
```

**Now when uploading:** Old caption is automatically deleted first!

---

### 2. Created Cleanup Script

**File:** `clean_duplicate_captions.php`

**What it does:**
1. Finds all videos with Bunny.net IDs
2. Deletes ALL existing captions from Bunny.net
3. Re-uploads clean captions with labels: EN, ES, PT
4. Ensures only 4 options in CC menu (Disabled + 3 languages)

---

## 🚀 How to Clean Up

### Step 1: Run Cleanup Script

```bash
php clean_duplicate_captions.php
```

**What happens:**
```
Processing Video models: 50 found

Video #17 (Bunny ID: fab28cdb-...)
  Title: Introduction to Laravel
  Deleting all existing captions...
  ✅ Deleted 6 caption tracks
  Re-uploading captions with clean labels (EN, ES, PT)...
    Uploading EN...
    ✅ EN uploaded
    Uploading ES...
    ✅ ES uploaded
    Uploading PT...
    ✅ PT uploaded

... (repeats for all videos)

=== Summary ===
Total models processed: 50
Total caption tracks deleted: 300

✅ Done!
```

---

### Step 2: Verify in Bunny.net Dashboard

```
1. Go to: https://dash.bunny.net
2. Stream → Video Library
3. Click on a video
4. Go to "Captions" tab
5. Should see ONLY:
   - EN
   - ES
   - PT
```

---

### Step 3: Test in Video Player

```
1. Open video page: /en/video/17
2. Play video
3. Click CC button (⚙️ → Captions)
4. Should see ONLY:
   - Disabled
   - EN
   - ES
   - PT
```

---

## 📊 Before vs After

### Before Cleanup:
```
CC Menu shows:
┌────────────────────────┐
│ Disabled              │
│ EN (EN-AUTO)          │ ← Bunny auto-generated
│ ES (ES-AUTO)          │ ← Bunny auto-generated
│ PT (PT-AUTO)          │ ← Bunny auto-generated
│ English (EN)          │ ← Old upload
│ Español (ES)          │ ← Old upload
│ Português (PT)        │ ← Old upload
└────────────────────────┘
7+ options ❌ Confusing!
```

### After Cleanup:
```
CC Menu shows:
┌────────────────────────┐
│ Disabled              │
│ EN                    │
│ ES                    │
│ PT                    │
└────────────────────────┘
4 options ✅ Clean!
```

---

## 🔧 Technical Details

### How Captions Work in Bunny.net

**Upload API:**
```http
POST https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/captions/{srclang}
Content-Type: application/json

{
  "srclang": "en",
  "label": "EN",
  "captionsFile": "base64_encoded_vtt_content"
}
```

**Key points:**
- `srclang`: Language code (en, es, pt) - used in iframe `&defaultTextTrack=en`
- `label`: Display name in CC menu (EN, ES, PT)
- Multiple captions with SAME `srclang` can exist! (causes duplicates)

**Delete API:**
```http
DELETE https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/captions/{srclang}
```

---

### Updated uploadCaptions Method

**Before:**
```php
public function uploadCaptions($videoId, $content, $language, $label)
{
    // Just uploads, doesn't check for duplicates
    Http::post($url, [
        'srclang' => $language,
        'label' => $label,
        'captionsFile' => base64_encode($content)
    ]);
}
```

**After:**
```php
public function uploadCaptions($videoId, $content, $language, $label, $deleteExisting = true)
{
    // Delete existing caption first!
    if ($deleteExisting) {
        $this->deleteCaption($videoId, $language);
    }
    
    // Then upload new one
    Http::post($url, [
        'srclang' => $language,
        'label' => $label,
        'captionsFile' => base64_encode($content)
    ]);
}
```

**Now:** Uploading automatically deletes old caption first! ✅

---

## 🎯 Why Duplicates Happened

### Reason 1: Bunny.net Auto-Captions
- Bunny.net can auto-generate captions (EN-AUTO, ES-AUTO)
- If enabled, these are added automatically
- Need to disable in Bunny.net settings

**Fix:** Disable auto-captioning in Bunny.net dashboard:
```
Video Library → Settings → Disable Auto-Captions
```

---

### Reason 2: Multiple Uploads Without Deletion
- Each time you process captions, new tracks are added
- Old tracks aren't deleted
- Result: Multiple tracks with same language

**Fix:** New uploadCaptions method deletes before uploading ✅

---

### Reason 3: Different Labels
- Old uploads used: "English", "Español", "Português"
- New uploads use: "EN", "ES", "PT"
- Bunny.net treats these as different tracks!

**Fix:** Always use consistent labels (EN, ES, PT) ✅

---

## 🧪 Testing the Cleanup

### Test 1: Check Bunny.net API

```bash
php artisan tinker
```

```php
$bunny = app(\App\Services\BunnyNetService::class);

// Delete all captions from a video
$result = $bunny->deleteAllCaptions('fab28cdb-0191-4...');
print_r($result);
// Should show: deleted_count => 6 (or however many existed)

// Re-upload clean captions
$video = \App\Models\Video::find(17);
foreach (['en', 'es', 'pt'] as $lang) {
    $vtt = $video->transcriptions[$lang]['vtt'];
    $label = strtoupper($lang);
    $bunny->uploadCaptions($video->bunny_video_id, $vtt, $lang, $label);
}
```

---

### Test 2: Check Video Player

```
1. Before cleanup:
   - Open /en/video/17
   - Click CC → See many options ❌

2. Run cleanup:
   php clean_duplicate_captions.php

3. After cleanup:
   - Refresh page
   - Click CC → See only 4 options ✅
```

---

### Test 3: Check Auto-Sync

```
1. Go to /en/video/17 → EN caption active ✅
2. Change to /es/video/17 → ES caption active ✅
3. Change to /pt/video/17 → PT caption active ✅
```

---

## 🚨 Important Notes

### Reprocessing Videos
After cleanup, if you reprocess a video in admin panel:
- Old captions will be auto-deleted
- New captions uploaded with clean labels (EN, ES, PT)
- No duplicates! ✅

### Bunny.net Auto-Captions
If Bunny.net auto-captions are enabled:
- They might regenerate after cleanup
- Disable in: Bunny.net Dashboard → Video Library → Settings

### Multiple Library IDs
If you have multiple Bunny.net libraries:
- Run cleanup script for each library
- Or specify library ID in script

---

## 📋 Cleanup Checklist

- [ ] Run cleanup script: `php clean_duplicate_captions.php`
- [ ] Check Bunny.net dashboard: Only EN, ES, PT exist
- [ ] Test video player: CC menu shows only 4 options
- [ ] Test language switching: Captions auto-sync
- [ ] Disable Bunny.net auto-captions (if enabled)
- [ ] Reprocess a video to confirm no duplicates

---

## 🎯 Expected Results

### CC Menu (After Cleanup):
```
┌──────────────────┐
│ Captions ←       │
├──────────────────┤
│ ○ Disabled       │
│ ● EN             │  ← Active
│ ○ ES             │
│ ○ PT             │
└──────────────────┘
```

**Clean, simple, exactly 4 options!** ✅

---

### Language Auto-Sync:
```
/en/video/17 → EN active ✅
/es/video/17 → ES active ✅
/pt/video/17 → PT active ✅
```

**Everything syncs automatically!** ✅

---

## 📚 Related Documentation

- `COMPLETE_LANGUAGE_AUTO_SYNC_FIX.md` - Caption & audio auto-sync
- `CAPTION_PARAMETER_FIX.md` - Correct iframe parameters
- `CAPTION_AUTO_SYNC_FIX.md` - Caption synchronization details

---

## 🔧 Troubleshooting

### Cleanup script fails with "Unauthorized"
**Fix:** Check `BUNNY_API_KEY` in `.env` file

### Captions still show duplicates after cleanup
**Fix:** 
1. Check Bunny.net dashboard directly
2. Manually delete captions via Bunny.net UI
3. Re-run cleanup script

### CC menu shows "EN-AUTO" after cleanup
**Fix:** Disable auto-captioning in Bunny.net settings

### Videos don't have captions after cleanup
**Fix:** Reprocess videos in admin panel to regenerate captions

---

**Created:** January 7, 2026  
**Status:** ✅ READY TO USE  
**Action:** Run `php clean_duplicate_captions.php`

🧹 **Clean up duplicate captions and get a perfect CC menu with only 4 options!**

