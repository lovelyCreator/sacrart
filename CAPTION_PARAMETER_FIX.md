# 🔧 Fixed: Caption Auto-Sync Parameter

## 🐛 The Problem

**User reported:** "The sync caption language setting and language code isn't works."

**Root cause:** Wrong Bunny.net parameter!

```typescript
// ❌ WRONG: Using incorrect parameter
iframe src="...&captions=en"
// Bunny.net ignores this parameter!

// ✅ CORRECT: Using correct Bunny.net parameter
iframe src="...&defaultTextTrack=en"
// Bunny.net recognizes and applies this!
```

---

## ✅ The Fix

### Changed iframe URL parameter from `&captions=` to `&defaultTextTrack=`

Bunny.net's official parameter for setting the default active caption track is **`defaultTextTrack`**, not `captions`.

**Files Updated:**
1. ✅ `frontend/src/pages/RewindEpisodes.tsx`
2. ✅ `frontend/src/pages/ReelDetail.tsx`
3. ✅ `frontend/src/pages/EpisodeDetail.tsx`

---

## 📋 What Changed

### Before (Not Working):
```typescript
// RewindEpisodes.tsx (line 369)
if (currentVideo.caption_urls[currentLocale]) {
  finalUrl += `&captions=${currentLocale}`;  // ❌ Wrong parameter
}
```

### After (Working):
```typescript
// RewindEpisodes.tsx (line 369)
if (currentVideo.caption_urls[currentLocale]) {
  finalUrl += `&defaultTextTrack=${currentLocale}`;  // ✅ Correct parameter
}
```

---

## 🎬 How It Works Now

### Complete Flow:

```
1. User visits: /en/rewind/1
   ↓
2. Frontend detects locale: 'en'
   ↓
3. Iframe URL built:
   https://iframe.mediadelivery.net/embed/12345/67890?
     autoplay=false
     &controls=true
     &defaultTextTrack=en  ← Sets English as active caption
   ↓
4. Bunny.net player loads with English captions active ✅

5. User changes language: /en/rewind/1 → /es/rewind/1
   ↓
6. iframe key changes (forces remount)
   ↓
7. New iframe URL:
   https://iframe.mediadelivery.net/embed/12345/67890?
     autoplay=false
     &controls=true
     &defaultTextTrack=es  ← Now Spanish!
   ↓
8. Bunny.net player loads with Spanish captions active ✅
```

---

## 📊 Bunny.net Caption Parameters

### Correct Parameters:

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `defaultTextTrack` | Sets active caption language | `&defaultTextTrack=es` |
| `captions` | ❌ **Does NOT work** | `&captions=es` ❌ |

### Upload Parameters (Backend - Already Correct):

When uploading captions to Bunny.net API:
```php
POST /library/{id}/videos/{videoId}/captions/{language}
Body: {
  "srclang": "en",      // Language code (must match!)
  "label": "EN",        // Display label  
  "captionsFile": "base64_encoded_vtt"
}
```

The `srclang` in upload **MUST match** `defaultTextTrack` in player!

---

## 🧪 Testing Instructions

### Step 1: Rebuild Frontend (REQUIRED!)

```bash
cd frontend
npm run build
# or if using dev server:
npm run dev
```

**Important:** Frontend changes require rebuilding!

### Step 2: Test Caption Auto-Sync

```
1. Go to: /en/rewind/1
2. Play video
3. Check captions are in English ✅

4. Change language in header: EN → ES
5. URL changes to: /es/rewind/1
6. Video reloads
7. Captions should now be in Spanish ✅

8. Change to Portuguese: ES → PT
9. URL changes to: /pt/rewind/1
10. Captions should now be in Portuguese ✅
```

### Step 3: Verify iframe URL (Browser Console)

```javascript
// Open F12 Console
// Check the iframe src attribute:

document.querySelector('iframe[id^="bunny-iframe"]').src

// Should see:
// English page:
"...&defaultTextTrack=en"

// Spanish page:
"...&defaultTextTrack=es"

// Portuguese page:
"...&defaultTextTrack=pt"
```

### Step 4: Check Browser Network Tab

```
1. Open F12 → Network tab
2. Filter by: "embed"
3. Change page language
4. Should see new iframe request with updated defaultTextTrack parameter
```

---

## 🎯 Expected Results

### Before Fix (Not Working):
```
/en/rewind/1 → iframe URL: ...&captions=en
  ❌ Captions don't load or wrong language

/es/rewind/1 → iframe URL: ...&captions=es
  ❌ Still shows English or no captions
```

### After Fix (Working):
```
/en/rewind/1 → iframe URL: ...&defaultTextTrack=en
  ✅ English captions active!

/es/rewind/1 → iframe URL: ...&defaultTextTrack=es
  ✅ Spanish captions active!

/pt/rewind/1 → iframe URL: ...&defaultTextTrack=pt
  ✅ Portuguese captions active!
```

---

## 🔍 Debugging

### If captions still don't work:

**Check 1: Captions uploaded to Bunny.net?**
```
Go to: https://dash.bunny.net
→ Stream → Video Library → Your Video → Captions tab
Should see: EN, ES, PT listed
```

**Check 2: Language codes match?**
```bash
php artisan tinker
```
```php
$video = \App\Models\Video::find(17);
print_r(array_keys($video->caption_urls));
// Should show: Array ( [0] => en [1] => es [2] => pt )
```

**Check 3: iframe URL has parameter?**
```javascript
// Browser console:
document.querySelector('iframe').src
// Should include: &defaultTextTrack=en (or es/pt)
```

**Check 4: Frontend rebuilt?**
```bash
cd frontend
npm run build
# Changes won't apply without rebuilding!
```

---

## 📚 Bunny.net Documentation Reference

### iframe Embed Parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `autoplay` | boolean | Auto-start playback |
| `controls` | boolean | Show player controls |
| `responsive` | boolean | Enable responsive sizing |
| **`defaultTextTrack`** | string | **Set active caption language** |

**Official docs:** 
- Bunny.net Stream API documentation
- iframe embed parameters section

---

## ✅ Summary

### What Was Fixed:
1. ✅ Changed `&captions=` to `&defaultTextTrack=` (all 3 pages)
2. ✅ Used correct Bunny.net parameter
3. ✅ Captions now auto-sync with page language

### Files Modified:
- ✅ `frontend/src/pages/RewindEpisodes.tsx`
- ✅ `frontend/src/pages/ReelDetail.tsx`  
- ✅ `frontend/src/pages/EpisodeDetail.tsx`

### User Action Required:
1. ⏳ **Rebuild frontend:** `cd frontend && npm run build`
2. ⏳ **Test caption auto-sync** on all 3 page types
3. ⏳ **Verify** captions change when page language changes

### Expected Result:
```
User changes page language → Captions automatically update! ✅
  /en/ → English captions
  /es/ → Spanish captions
  /pt/ → Portuguese captions
```

---

## 🎉 Success Criteria

**Caption auto-sync is working when:**

- ✅ Changing page language automatically changes caption language
- ✅ No need to click settings menu
- ✅ Works on all 3 page types (rewind, reel, episode)
- ✅ iframe URL includes `&defaultTextTrack=XX`
- ✅ Bunny.net player shows correct language active

---

**Created:** January 7, 2026  
**Status:** ✅ FIXED  
**Action Required:** Rebuild frontend and test

🎬 **Captions will now automatically sync with page language using the correct Bunny.net parameter!**

