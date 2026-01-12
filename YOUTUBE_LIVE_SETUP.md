# YouTube Live Stream Setup Guide

## Overview

The platform now supports YouTube live streaming with the following features:
- **Live Page**: Shows YouTube live stream with embedded video player and live chat
- **Live Archive**: Past live streams stored in the database (manually uploaded by admin)
- **Real-time Chat**: YouTube live chat embedded alongside the video
- **Auto-detection**: Automatically shows/hides live stream based on settings

## Pages

### 1. Live Page (`/live`)
- **Purpose**: Display YouTube live streams in real-time
- **Features**:
  - Embedded YouTube video player (16:9 aspect ratio)
  - Live chat panel (responsive, full height)
  - Auto-detection of live status
  - Links to YouTube channel and archive
- **When Not Live**: Shows a message with links to:
  - YouTube channel (for notifications)
  - Live archive page
  - Home page

### 2. Live Archive Page (`/directos`)
- **Purpose**: Browse and watch past live streams
- **Access**: "Directos" button in homepage "Exclusive Formats" section
- **Content**: Videos tagged as "directo", "live", or "twitch"

## Navigation

### Homepage "Directos" Button
- **Location**: Exclusive Formats carousel section
- **Destination**: `/directos` (Live Archive)
- **Purpose**: Access past live streams

### Header Navigation
You can optionally add a "Live" link in the header that goes to `/live`

## Admin Setup

### Configure Live Stream Settings

1. **Go to Admin Panel > Settings > Live tab**

2. **Configure these settings**:
   
   | Setting | Description | Example |
   |---------|-------------|---------|
   | YouTube Live Video URL | Current live stream URL or video ID | `https://youtube.com/watch?v=abc123` or just `abc123` |
   | YouTube Channel ID | Your channel ID or handle | `UCxxxxx` or `@yourhandle` |
   | YouTube Channel URL | Full channel URL | `https://youtube.com/@yourhandle` |
   | YouTube Live Enabled | Toggle to enable/disable live stream | ON when streaming, OFF when not |

### How to Start a Live Stream

1. **Start your YouTube live stream** (on YouTube Studio)
2. **Copy the video URL** from YouTube
3. **Go to Admin Panel > Settings > Live**
4. **Paste the video URL** in "YouTube Live Video URL" field
5. **Toggle "YouTube Live Enabled"** to ON
6. **Save changes**
7. Users can now watch at `/live`

### How to End a Live Stream

1. **End the stream on YouTube**
2. **Go to Admin Panel > Settings > Live**
3. **Toggle "YouTube Live Enabled"** to OFF
4. **Save changes**
5. **Download the video** from YouTube
6. **Upload to Live Archive**:
   - Go to Admin Panel > Content Management > Videos
   - Create new video
   - Add tags: "directo", "live", or "twitch"
   - This video will appear in the Live Archive page

## Technical Details

### URL Formats Supported

The system accepts these URL formats for YouTube videos:
- Full URL: `https://youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Embed URL: `https://youtube.com/embed/VIDEO_ID`
- Direct ID: `VIDEO_ID`

### Channel ID Formats

- Channel ID: `UCxxxxxxxxxxxxx`
- Channel handle: `@yourhandle`
- Full URL: `https://youtube.com/@yourhandle`

### Live Detection

The live page shows the stream when:
- `youtube_live_enabled` is set to `true`
- `youtube_live_video_url` is not empty

When not live:
- Shows "Not streaming" message
- Provides links to channel and archive
- Users can subscribe to YouTube for notifications

## Features

### Real-Time Chat
- YouTube live chat embedded in iframe
- Full height responsive design
- Shows on large screens (desktop/tablet)
- Mobile-optimized layout

### Responsive Design
- **Desktop**: Video (2/3 width) + Chat (1/3 width)
- **Mobile**: Video (full width), Chat below

### Live Indicator
- Red "LIVE NOW" badge at top of page
- Pulsing animation
- Viewer count indicator

### Automatic Workflow

1. **When Live**:
   - `/live` shows the stream
   - `/directos` shows archive

2. **When Not Live**:
   - `/live` shows "not streaming" message
   - `/directos` shows archive

## Translations

All text is translated in 3 languages:
- **English** (EN)
- **Spanish** (ES)
- **Portuguese** (PT)

Translation keys are in: `frontend/src/i18n/locales/*/translation.json`

## User Flow

### Watching Live
1. User clicks "Live" or sees notification
2. Goes to `/live`
3. Watches embedded YouTube stream
4. Participates in live chat
5. Can subscribe to channel for future notifications

### Watching Archive
1. User clicks "Directos" in homepage formats section
2. Goes to `/directos` (Live Archive)
3. Browses past streams
4. Clicks to watch any past video

## Notes

- **Subtitles**: YouTube provides real-time auto-generated subtitles
- **Chat Moderation**: Managed through YouTube Studio
- **Analytics**: View stream analytics in YouTube Studio
- **Notifications**: Users subscribe on YouTube to get notified
- **Archive Process**: Manual (download from YouTube, upload to platform)

## Future Enhancements

Potential improvements:
- Auto-detect when YouTube stream ends
- Automatic archiving from YouTube
- Stream scheduling/calendar
- Email notifications for subscribers
- Stream replay (DVR) functionality
