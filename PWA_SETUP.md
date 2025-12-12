# PWA (Progressive Web App) Setup Guide

This guide explains how the PWA is configured and how to test it.

## 📱 What is PWA?

Progressive Web Apps (PWAs) allow your website to be installed on mobile devices and desktop browsers, providing an app-like experience with:
- **Installable**: Users can add it to their home screen
- **Offline Support**: Works offline with service workers
- **App-like Experience**: Full-screen mode, no browser UI
- **Fast Loading**: Cached resources for quick access

## 🔧 Configuration Files

### 1. **manifest.json** (`frontend/public/manifest.json`)
Defines how the app appears when installed:
- App name and description
- Icons for different sizes
- Theme colors
- Display mode (standalone = full-screen)
- Start URL and scope

### 2. **Service Worker** (`frontend/public/sw.js`)
Handles offline functionality and caching:
- Caches essential resources
- Serves cached content when offline
- Updates cache when new content is available

### 3. **HTML Meta Tags** (`frontend/index.html`)
Additional PWA support:
- Apple iOS specific tags
- Microsoft Windows tiles
- Theme color
- Apple touch icons

## 🎨 Icon Requirements

For best PWA support, you should have icons in these sizes:

### Required Icons:
- **192x192** - Android home screen
- **512x512** - Android splash screen
- **180x180** - Apple touch icon (iOS)

### Currently Using:
- `/favicon.png` - Used for all icon sizes (will be scaled)
- `/logo-sacrart.png` - Alternative icon

### ⚠️ Recommendation:
For production, create properly sized icons:
1. Create icons in these sizes: 192x192, 512x512, 180x180
2. Place them in `frontend/public/` folder
3. Update `manifest.json` with specific icon paths

Example icon structure:
```
frontend/public/
  ├── icon-192x192.png
  ├── icon-512x512.png
  ├── icon-180x180.png (Apple touch icon)
  └── favicon.png
```

## 🧪 How to Test PWA

### Prerequisites:
1. Build the production version: `npm run build`
2. Serve the built files (not dev server)
3. Use HTTPS (required for PWA) or localhost

### Testing Methods:

#### 1. **Chrome DevTools (Recommended)**

**Steps:**
1. Build the app:
   ```bash
   cd frontend
   npm run build
   ```

2. Serve the built files:
   ```bash
   # Option 1: Using a simple HTTP server
   npx serve -s dist -l 3000
   
   # Option 2: Using Python
   cd dist
   python -m http.server 3000
   
   # Option 3: Using PHP
   cd dist
   php -S localhost:3000
   ```

3. Open Chrome and navigate to `http://localhost:3000`

4. Open DevTools (F12) → **Application** tab

5. Check **Manifest**:
   - Should show app name, icons, colors
   - No errors should appear

6. Check **Service Workers**:
   - Should show registered service worker
   - Status should be "activated and running"

7. Check **Application** → **Storage**:
   - Cache should be populated

#### 2. **Install Prompt Test**

**Chrome/Edge:**
1. Visit the site
2. Look for install icon in address bar (⊕)
3. Click to install
4. App should open in standalone window

**Mobile Chrome (Android):**
1. Visit the site
2. Tap menu (⋮) → "Add to Home screen"
3. Confirm installation
4. App icon appears on home screen

**Safari (iOS):**
1. Visit the site
2. Tap Share button (□↑)
3. Tap "Add to Home Screen"
4. Customize name and tap "Add"
5. App icon appears on home screen

#### 3. **Lighthouse Audit**

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Select **Progressive Web App** checkbox
4. Click **Generate report**
5. Should score 90+ for PWA

**What Lighthouse Checks:**
- ✅ Has a manifest
- ✅ Has a service worker
- ✅ Served over HTTPS (or localhost)
- ✅ Has icons
- ✅ Registers service worker
- ✅ Responds with 200 when offline

#### 4. **Offline Test**

**Steps:**
1. Open DevTools → **Network** tab
2. Check "Offline" checkbox
3. Refresh the page
4. Site should still load (from cache)
5. Uncheck "Offline" to restore connection

#### 5. **Mobile Device Testing**

**Android:**
1. Connect phone to same network
2. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Visit `http://YOUR_IP:3000` on phone
4. Test install prompt

**iOS:**
1. Same as Android
2. Use Safari browser
3. Test "Add to Home Screen"

### Testing Checklist:

- [ ] Manifest loads without errors
- [ ] Service worker registers successfully
- [ ] Icons display correctly
- [ ] Install prompt appears (desktop)
- [ ] Can install on mobile home screen
- [ ] App opens in standalone mode
- [ ] Works offline (after first visit)
- [ ] Theme color matches design
- [ ] App name displays correctly
- [ ] Lighthouse PWA score > 90

## 🐛 Troubleshooting

### Issue: Install prompt doesn't appear
**Solutions:**
- Must be served over HTTPS (or localhost)
- Must have valid manifest.json
- Must have service worker registered
- User must visit site at least once
- Clear browser cache and try again

### Issue: Service worker not registering
**Solutions:**
- Check browser console for errors
- Ensure `sw.js` is in `public/` folder
- Verify service worker registration code in `main.tsx`
- Check that you're in production build (not dev mode)

### Issue: Icons not showing
**Solutions:**
- Verify icon paths in manifest.json
- Icons must be in `public/` folder (not `src/`)
- Check icon file sizes and formats
- Clear browser cache

### Issue: App doesn't work offline
**Solutions:**
- Verify service worker is active
- Check cache in DevTools → Application → Cache Storage
- Ensure resources are being cached
- Test after visiting site at least once

## 📝 Production Deployment

Before deploying to production:

1. **Create proper icons:**
   - Generate 192x192, 512x512, 180x180 icons
   - Use your logo/branding
   - Place in `public/` folder

2. **Update manifest.json:**
   - Use production URLs
   - Update start_url if needed
   - Verify all icon paths

3. **Test on real devices:**
   - Test on Android phone
   - Test on iPhone/iPad
   - Test on desktop browsers

4. **HTTPS Required:**
   - PWA requires HTTPS in production
   - Service workers only work over HTTPS (or localhost)

5. **Update service worker version:**
   - Change `CACHE_NAME` in `sw.js` when updating
   - This forces cache refresh for users

## 🚀 Quick Start Testing

```bash
# 1. Build the app
cd frontend
npm run build

# 2. Serve the built files
npx serve -s dist -l 3000

# 3. Open in Chrome
# Navigate to http://localhost:3000

# 4. Open DevTools → Application tab
# Check Manifest and Service Workers

# 5. Test install
# Look for install icon in address bar
```

## 📚 Additional Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [PWA Checklist](https://web.dev/pwa-checklist/)

