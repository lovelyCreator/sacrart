# Check Bunny.net Configuration for Deepgram

## Quick Diagnosis

Run this command to check your configuration:

```bash
php artisan tinker
```

Then paste:

```php
echo "=== Bunny.net Configuration Check ===\n\n";

echo "BUNNY_API_KEY: " . (config('services.bunny.api_key') ? '✓ SET' : '✗ NOT SET') . "\n";
echo "BUNNY_LIBRARY_ID: " . (config('services.bunny.library_id') ? '✓ SET' : '✗ NOT SET') . "\n";
echo "BUNNY_CDN_URL: " . (config('services.bunny.cdn_url') ? '✓ SET (' . config('services.bunny.cdn_url') . ')' : '✗ NOT SET') . "\n";
echo "BUNNY_STORAGE_ZONE_NAME: " . (config('services.bunny.storage_zone_name') ? '✓ SET (' . config('services.bunny.storage_zone_name') . ')' : '✗ NOT SET') . "\n";
echo "BUNNY_STORAGE_ACCESS_KEY: " . (config('services.bunny.storage_access_key') ? '✓ SET (length: ' . strlen(config('services.bunny.storage_access_key')) . ')' : '✗ NOT SET') . "\n";

echo "\n=== Testing Storage API URL Generation ===\n\n";

// Test with a sample video ID (replace with your actual video ID)
$testVideoId = 'YOUR_VIDEO_ID_HERE'; // Replace this!
$service = app(\App\Services\BunnyNetService::class);
$url = $service->getDownloadUrl($testVideoId, '720');

if ($url) {
    echo "✓ SUCCESS! URL generated:\n";
    echo substr($url, 0, 100) . "...\n\n";
    echo "This URL should work for Deepgram transcription.\n";
} else {
    echo "✗ FAILED! getDownloadUrl returned null.\n\n";
    echo "Check the issues above and configure the missing values.\n";
}
```

## What You Need in .env

Your `.env` file should have:

```env
# Basic Bunny.net config (you already have these)
BUNNY_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_LIBRARY_ID=123456
BUNNY_CDN_URL=https://vz-xxxxxxxx-xxx.b-cdn.net

# Storage API config (REQUIRED for Deepgram - add these if missing)
BUNNY_STORAGE_ZONE_NAME=vz-xxxxxxxx-xxx
BUNNY_STORAGE_ACCESS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxx
```

## How to Get Missing Values

### 1. BUNNY_STORAGE_ZONE_NAME

**Option A**: Check your CDN URL
- If `BUNNY_CDN_URL=https://vz-0cc8af54-835.b-cdn.net`
- Then `BUNNY_STORAGE_ZONE_NAME=vz-0cc8af54-835`

**Option B**: Check Bunny.net Dashboard
1. Login to https://dash.bunny.net
2. Go to **Storage**
3. Find your video storage zone
4. The name is displayed at the top (e.g., `vz-0cc8af54-835`)

### 2. BUNNY_STORAGE_ACCESS_KEY

**IMPORTANT**: This is NOT the same as your API key!

1. Login to https://dash.bunny.net
2. Go to **Storage**
3. Click on your storage zone (the one with videos)
4. Go to **"FTP & HTTP API"** tab
5. Look for **"HTTP API Access Key"**
6. Copy the key (it's different from FTP password!)

**Common Mistake**: Don't use the FTP password! You need the HTTP API Access Key.

## Test the Configuration

After adding the values to `.env`:

```bash
# 1. Clear config cache
php artisan config:clear

# 2. Test URL generation
php artisan tinker
```

```php
// Replace YOUR_VIDEO_ID with an actual Bunny.net video ID from your database
$videoId = 'abc123-def456-ghi789'; 
$service = app(\App\Services\BunnyNetService::class);
$url = $service->getDownloadUrl($videoId, '720');
echo $url . "\n";

// Should output something like:
// https://storage.bunnycdn.com/vz-xxx/abc123-def456-ghi789/play_720p.mp4?accessKey=xxx
```

If you see a URL, it's working! ✅

If you get `null`, check:
- ✅ `BUNNY_STORAGE_ZONE_NAME` is set
- ✅ `BUNNY_STORAGE_ACCESS_KEY` is set (and it's the HTTP API key, not FTP password)
- ✅ You ran `php artisan config:clear`

## Quick Fix Script

Copy this to a file `check_bunny.php` in your project root:

```php
<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Bunny.net Configuration Check ===\n\n";

$checks = [
    'BUNNY_API_KEY' => config('services.bunny.api_key'),
    'BUNNY_LIBRARY_ID' => config('services.bunny.library_id'),
    'BUNNY_CDN_URL' => config('services.bunny.cdn_url'),
    'BUNNY_STORAGE_ZONE_NAME' => config('services.bunny.storage_zone_name'),
    'BUNNY_STORAGE_ACCESS_KEY' => config('services.bunny.storage_access_key'),
];

foreach ($checks as $key => $value) {
    $status = $value ? '✓' : '✗';
    $display = $value ? (strlen($value) > 50 ? substr($value, 0, 30) . '...' : $value) : 'NOT SET';
    echo "{$status} {$key}: {$display}\n";
}

echo "\n";

if (!$checks['BUNNY_STORAGE_ZONE_NAME'] || !$checks['BUNNY_STORAGE_ACCESS_KEY']) {
    echo "❌ MISSING REQUIRED CONFIGURATION!\n\n";
    echo "To fix:\n";
    echo "1. Add to .env:\n";
    echo "   BUNNY_STORAGE_ZONE_NAME=vz-xxxxxxxx-xxx\n";
    echo "   BUNNY_STORAGE_ACCESS_KEY=your-http-api-access-key\n\n";
    echo "2. Run: php artisan config:clear\n\n";
    echo "3. See CHECK_BUNNY_CONFIG.md for detailed instructions\n";
} else {
    echo "✅ All required configuration is present!\n";
    echo "\nTry processing a video now.\n";
}
```

Run it:
```bash
php check_bunny.php
```

## After Fixing

Once you've added the missing values:

```bash
# Clear cache
php artisan config:clear

# Try processing a video
# Admin Panel → Videos → ⋮ → "Process Captions (AI)"
```

## Still Not Working?

Check Laravel logs for detailed error:

```bash
tail -f storage/logs/laravel.log
```

Look for lines containing:
- `getDownloadUrl returned null`
- `Storage Zone Name is not configured`
- `Storage Access Key is not configured`

The logs will tell you exactly what's missing!

## Summary

✅ **Required in .env**:
- `BUNNY_STORAGE_ZONE_NAME` - Your storage zone name
- `BUNNY_STORAGE_ACCESS_KEY` - HTTP API Access Key (NOT FTP password!)

✅ **After adding**:
- Run `php artisan config:clear`
- Try processing a video

✅ **To verify**:
- Run the tinker command above
- Should output a URL
- That URL should work for Deepgram

---

Need help finding these values? See the detailed instructions above! 📚





