# Google Cloud API Key Information

## Your API Key

**API Key**: `AIzaSyD6I9ZFE2r7Sj4Ly-JOxWJixnTTgx09ljY`

**Type**: Browser/REST API Key (AIzaSy... format)

**Status**: ⚠️ **EXPIRED** - The API key has expired and needs to be renewed or replaced.

## What This API Key Is

This is a **REST API Key** (also called a Browser Key) that can be used to authenticate requests to Google Cloud APIs via REST endpoints. It's the simpler authentication method compared to service accounts.

### Advantages:
- ✅ Easy to use (just add `?key=YOUR_KEY` to API URLs)
- ✅ Works with Translation API
- ✅ Works with Text-to-Speech API
- ✅ No need to download JSON credentials file

### Limitations:
- ⚠️ Less secure (exposed in URLs)
- ⚠️ May have usage quotas
- ⚠️ Speech-to-Text API may require service account for some operations

## How to Get a New API Key

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create a new one)

### Step 2: Enable Required APIs
1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Cloud Translation API**
   - **Cloud Text-to-Speech API**
   - **Cloud Speech-to-Text API**

### Step 3: Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API Key**
3. Copy the new API key

### Step 4: Restrict the API Key (Recommended)
1. Click on the API key to edit it
2. Under **API restrictions**, select **Restrict key**
3. Choose these APIs:
   - Cloud Translation API
   - Cloud Text-to-Speech API
   - Cloud Speech-to-Text API
4. Under **Application restrictions**, choose:
   - **IP addresses** (for server-side use)
   - Add your server's IP address
5. Click **Save**

## How to Use in Your Project

### 1. Add to `.env` file:
```env
GOOGLE_CLOUD_API_KEY=YOUR_NEW_API_KEY_HERE
```

### 2. The service is already configured to use it!

The `GoogleCloudAudioService` has been updated to use REST API calls with your API key. No additional packages needed!

## Implementation Status

✅ **Translation API** - Fully implemented using REST API  
✅ **Text-to-Speech API** - Fully implemented using REST API  
✅ **Speech-to-Text API** - Fully implemented using REST API  
✅ **Audio Extraction** - Uses FFMpeg (already in your codebase)

## Testing Your New API Key

Once you have a new API key, test it:

```bash
php test_google_api_key.php
```

Or update the API key in the test file and run it.

## Cost Estimation

For a 10-minute video with 2 additional languages:
- **Speech-to-Text**: ~$0.16 (10 minutes × $0.016 per minute)
- **Translation**: ~$0.10 (assuming 2000 characters)
- **Text-to-Speech**: ~$0.40 (2000 characters × $0.0002 per char)

**Total per video**: ~$0.66 for 2 additional languages

## Security Best Practices

1. **Restrict API Key**: Only allow the 3 APIs you need
2. **IP Restriction**: Restrict to your server's IP address
3. **Monitor Usage**: Check usage in Google Cloud Console regularly
4. **Set Quotas**: Set daily/monthly quotas to prevent unexpected charges
5. **Rotate Keys**: Regenerate keys periodically

## Next Steps

1. ✅ Get a new API key from Google Cloud Console
2. ✅ Enable the 3 required APIs
3. ✅ Add the key to your `.env` file
4. ✅ Test with `test_google_api_key.php`
5. ✅ The service is ready to use!

## Alternative: Service Account (More Secure)

If you prefer a more secure approach:

1. Create a **Service Account** in Google Cloud Console
2. Download the JSON key file
3. Store it in `storage/app/google-cloud/service-account-key.json`
4. Add to `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=storage/app/google-cloud/service-account-key.json
   ```

The service supports both methods, but REST API key is simpler for getting started.

