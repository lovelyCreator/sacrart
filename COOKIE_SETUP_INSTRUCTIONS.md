# Cookie Consent Banner Setup Instructions

## Overview
We've implemented a Cookie Consent Management Platform (CMP) using **CookieYes** to comply with GDPR, CCPA, and other privacy regulations. The banner blocks Google Analytics and YouTube iframes until the user explicitly consents.

## Setup Steps

### 1. Register with CookieYes

1. Go to [https://www.cookieyes.com/](https://www.cookieyes.com/)
2. Click "Start Free Trial" or "Sign Up"
3. Create an account (free tier available)
4. Add your website domain (e.g., `sacrart.com`)

### 2. Get Your Script ID

1. After adding your website, CookieYes will provide you with an installation code
2. The code will look like this:
   ```html
   <script 
     id="cookieyes" 
     type="text/javascript" 
     src="https://cdn-cookieyes.com/client_data/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/script.js"
   ></script>
   ```
3. Copy the ID from the URL (the part after `/client_data/` and before `/script.js`)
   - Example: If URL is `https://cdn-cookieyes.com/client_data/abc123-def456/script.js`
   - Your ID is: `abc123-def456`

### 3. Update the Script in index.html

1. Open `frontend/index.html`
2. Find this line:
   ```html
   <script 
     id="cookieyes" 
     type="text/javascript" 
     src="https://cdn-cookieyes.com/client_data/YOUR_COOKIEYES_ID/script.js"
   ></script>
   ```
3. Replace `YOUR_COOKIEYES_ID` with your actual CookieYes script ID
4. Save the file

### 4. Configure Cookie Categories in CookieYes Dashboard

In your CookieYes dashboard, configure the following cookie categories:

#### **Necessary Cookies** (Always enabled, cannot be disabled)
- Session cookies
- Authentication cookies
- Security cookies

#### **Analytics Cookies** (Blocked until consent)
- Google Analytics (gtag.js)
- Google Analytics (analytics.js)
- Any other analytics scripts

#### **Marketing Cookies** (Blocked until consent)
- YouTube iframes
- YouTube API
- Social media embeds
- Advertising scripts

#### **Functional Cookies** (Optional)
- Preference cookies
- Language settings

### 5. Configure Script Blocking in CookieYes

1. In CookieYes dashboard, go to "Cookie Scanner" or "Script Blocking"
2. Add the following scripts to be blocked until consent:

   **For Google Analytics:**
   - Script URL pattern: `*google-analytics.com*`
   - Script URL pattern: `*googletagmanager.com*`
   - Script URL pattern: `*gtag.js*`
   - Script URL pattern: `*analytics.js*`

   **For YouTube:**
   - Script URL pattern: `*youtube.com/iframe_api*`
   - Iframe pattern: `*youtube.com*`
   - Iframe pattern: `*youtu.be*`

3. Assign these to the appropriate cookie categories:
   - Google Analytics → Analytics category
   - YouTube → Marketing category

### 6. Customize the Banner

In CookieYes dashboard, customize:

1. **Banner Design:**
   - Position (bottom, top, etc.)
   - Colors (match your brand)
   - Language (English, Spanish, Portuguese)

2. **Banner Text:**
   - Title
   - Description
   - Button labels

3. **Required Buttons:**
   - ✅ "Accept All" button
   - ✅ "Reject All" button
   - ✅ "Configure" / "Preferences" button

4. **Cookie Policy Link:**
   - Set the link to: `/politica-de-cookies` (or full URL: `https://yourdomain.com/politica-de-cookies`)

### 7. Test the Implementation

1. Clear your browser cookies and localStorage
2. Visit your website
3. You should see the cookie banner
4. Test scenarios:
   - ✅ Click "Accept All" → Analytics and YouTube should load
   - ✅ Click "Reject All" → Nothing should load
   - ✅ Click "Configure" → Should show category options
   - ✅ Don't click anything → Nothing should load (pre-blocking works)

### 8. Verify Script Blocking

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Before consent:
   - ❌ Should NOT see requests to `google-analytics.com`
   - ❌ Should NOT see requests to `youtube.com/iframe_api`
   - ❌ Should NOT see YouTube iframes loading
5. After clicking "Accept All":
   - ✅ Should see analytics requests
   - ✅ Should see YouTube API loading
   - ✅ YouTube videos should work

## Important Notes

### Pre-blocking Requirement
- CookieYes automatically blocks scripts BEFORE consent
- No manual code changes needed for basic blocking
- The `cookieConsent.ts` utility is for additional checks in React components

### YouTube Integration
- The `VideoPlayer.tsx` component checks consent before loading YouTube API
- If user rejects marketing cookies, YouTube videos won't load
- A message should be shown to users explaining they need to accept cookies

### Google Analytics
- If you plan to add Google Analytics, add it to `index.html` AFTER the CookieYes script
- CookieYes will automatically block it until consent
- Example:
  ```html
  <!-- CookieYes script (must be first) -->
  <script id="cookieyes" ...></script>
  
  <!-- Google Analytics (will be blocked until consent) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
  ```

## Troubleshooting

### Banner not showing?
- Check that CookieYes script ID is correct
- Verify script is loading in Network tab
- Check browser console for errors
- Ensure domain is added in CookieYes dashboard

### Scripts loading before consent?
- Verify script blocking is configured in CookieYes dashboard
- Check that scripts are added to the correct categories
- Ensure CookieYes script loads BEFORE other scripts in `<head>`

### YouTube not working after consent?
- Check `hasMarketingConsent()` function in browser console
- Verify CookieYes consent object structure
- Check browser console for YouTube API errors

## Support

- CookieYes Documentation: [https://www.cookieyes.com/documentation/](https://www.cookieyes.com/documentation/)
- CookieYes Support: [https://www.cookieyes.com/support/](https://www.cookieyes.com/support/)

## Alternative: Manual Implementation

If you prefer not to use CookieYes, you can implement a manual solution using:
- **Klaro!**: [https://klaro.kiprotect.com/](https://klaro.kiprotect.com/)
- **Osano Open Source**: [https://www.osano.com/](https://www.osano.com/)

However, CookieYes is recommended for easier maintenance and automatic updates.
