# How to Check Bunny.net API Credentials

## Step 1: Check Your .env File

Open your `.env` file in the project root and verify these variables are set:

```env
BUNNY_API_KEY=your_api_key_here
BUNNY_LIBRARY_ID=your_library_id_here
BUNNY_CDN_URL=your_cdn_url.b-cdn.net
BUNNY_STREAM_URL=your_stream_url.b-cdn.net
```

## Step 2: How to Get Your Bunny.net Credentials

### 1. API Key (BUNNY_API_KEY)
1. Log in to your Bunny.net account: https://bunny.net
2. Go to **Account** → **API Keys**
3. Copy your **API Key** (or create a new one if needed)
4. Paste it in your `.env` file as `BUNNY_API_KEY`

### 2. Library ID (BUNNY_LIBRARY_ID)
1. In Bunny.net dashboard, go to **Video Library**
2. Select your video library
3. The **Library ID** is shown in:
   - The URL: `https://bunny.net/video-library/{LIBRARY_ID}`
   - Or in the library settings page
4. Copy the Library ID and paste it in your `.env` file as `BUNNY_LIBRARY_ID`

### 3. CDN URL (BUNNY_CDN_URL)
1. In your Video Library settings
2. Look for **CDN Hostname** or **Pull Zone**
3. It should be in format: `xxxxx.b-cdn.net`
4. Copy it and paste in `.env` as `BUNNY_CDN_URL`

### 4. Stream URL (BUNNY_STREAM_URL)
1. Usually the same as CDN URL
2. Or check your Video Library settings for **Stream Hostname**
3. Format: `xxxxx.b-cdn.net`
4. Copy it and paste in `.env` as `BUNNY_STREAM_URL`

## Step 3: Clear Config Cache

After updating `.env`, run:

```bash
php artisan config:clear
```

## Step 4: Test the Configuration

You can test if your credentials are working by checking the Laravel logs when you try to fetch video metadata. The logs will show:

- ✅ If credentials are correct: "Bunny.net video fetched successfully"
- ❌ If API key is missing: "BUNNY_API_KEY is not set in .env file"
- ❌ If Library ID is missing: "BUNNY_LIBRARY_ID is not set in .env file"
- ❌ If authentication fails: "Bunny.net API returned status 401"
- ❌ If video not found: "Bunny.net API returned status 404"

## Step 5: Check Laravel Logs

View the logs to see detailed error messages:

```bash
tail -f storage/logs/laravel.log
```

Or check the latest log file:
```bash
cat storage/logs/laravel-$(date +%Y-%m-%d).log | tail -50
```

## Common Issues

1. **"BUNNY_API_KEY is not set"**
   - Make sure you've added `BUNNY_API_KEY=...` to your `.env` file
   - Run `php artisan config:clear` after adding it

2. **"Bunny.net API returned status 401"**
   - Your API key is incorrect or expired
   - Generate a new API key from Bunny.net dashboard

3. **"Bunny.net API returned status 404"**
   - The video ID is incorrect
   - The video doesn't exist in your library
   - Check the video ID in your Bunny.net dashboard

4. **"Video not found"**
   - Make sure the video exists in your Bunny.net library
   - Verify the video ID matches exactly (case-sensitive)

## Example .env Configuration

```env
BUNNY_API_KEY=abc123-def456-ghi789-jkl012-mno345-pqr678-stu901
BUNNY_LIBRARY_ID=123456
BUNNY_CDN_URL=vz-abc123.b-cdn.net
BUNNY_STREAM_URL=vz-abc123.b-cdn.net
```

