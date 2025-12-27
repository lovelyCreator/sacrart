# Google Cloud API Setup Checklist

## ✅ API Key Status
- **API Key**: `AIzaSyB7...`
- **Status**: ✅ Valid (but APIs need to be enabled)
- **Project ID**: `17563415604`

## 🔧 Required Actions

### Step 1: Enable Required APIs

Go to Google Cloud Console and enable these APIs:

1. **Cloud Translation API**
   - Direct link: https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=17563415604
   - Or: APIs & Services → Library → Search "Translation" → Enable

2. **Cloud Text-to-Speech API**
   - Direct link: https://console.developers.google.com/apis/api/texttospeech.googleapis.com/overview?project=17563415604
   - Or: APIs & Services → Library → Search "Text-to-Speech" → Enable

3. **Cloud Speech-to-Text API** (Optional for now - wait for client approval)
   - Direct link: https://console.developers.google.com/apis/api/speech.googleapis.com/overview?project=17563415604
   - Or: APIs & Services → Library → Search "Speech-to-Text" → Enable

### Step 2: Add API Key to .env File

Add this line to your `.env` file:

```env
GOOGLE_CLOUD_API_KEY=AIzaSyB7qVy8Lm-UpndDJXkMX_iIhGpv7di6CEE
```

### Step 3: Test APIs (After Enabling)

Once APIs are enabled, test with:

```bash
php test_google_api_key.php
```

## 📋 Current Status

| API | Status | Action Needed |
|-----|--------|----------------|
| Translation API | ⚠️ Not Enabled | Enable in Google Cloud Console |
| Text-to-Speech API | ⚠️ Not Enabled | Enable in Google Cloud Console |
| Speech-to-Text API | ⏸️ Waiting | Wait for client approval |

## 🎯 What Works Now

✅ API key is valid  
✅ Service code is ready  
✅ Configuration is set up  
⏳ Just need to enable APIs in Google Cloud Console

## 📝 Notes

- **Speech-to-Text**: We'll wait for client approval before testing
- **Translation & Text-to-Speech**: Can be enabled and tested immediately
- After enabling APIs, wait 1-2 minutes for changes to propagate

## 🔒 Security Recommendations

1. **Restrict API Key**:
   - Go to APIs & Services → Credentials
   - Click on your API key
   - Under "API restrictions", select "Restrict key"
   - Choose only: Translation API, Text-to-Speech API, Speech-to-Text API

2. **IP Restriction** (Optional but recommended):
   - Under "Application restrictions"
   - Select "IP addresses"
   - Add your server's IP address

3. **Set Quotas**:
   - Go to APIs & Services → Quotas
   - Set daily/monthly limits to prevent unexpected charges

