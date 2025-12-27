# Homepage Video Selection Guide

## Overview
When you select videos in the admin panel (`Settings` → `Videos` tab), those videos appear in multiple sections on the homepage (after login).

## How It Works

### 1. **Admin Panel - Video Selection**
**Location**: Admin Panel → Settings → Videos Tab

**How to Select Videos**:
- Click on any video card to toggle selection
- Selected videos show a "Show on Homepage" badge
- Video IDs are saved to database as `homepage_video_ids` (JSON array)
- Selection is saved immediately when you click a video

**Features**:
- Search videos by title or description
- Filter by status (All, Published, Draft)
- Clear all selections button
- Shows video details: title, description, category, duration, views

### 2. **Homepage Display (After Login)**

Selected videos appear in **3 different sections** on the homepage:

#### **Section 1: Hero Section** (Top of Page)
- **Uses**: First video from selected list (`homepageVideos[0]`)
- **Displays**:
  - Large background image (from video's `intro_image` or `thumbnail`)
  - Video title
  - Video category name
  - Video description
  - "Play" and "More Info" buttons
- **If no videos selected**: Falls back to hero settings or default content

#### **Section 2: "Tendencias Ahora" (Trending Now)**
- **Uses**: First 4 videos (`homepageVideos.slice(0, 4)`)
- **Displays**:
  - Grid layout (1 column mobile, 2 tablet, 4 desktop)
  - Video thumbnail
  - Video title
  - Duration badge
  - Instructor/category name
  - Clickable cards that navigate to video/series page

#### **Section 3: "Novedades esta semana" (New Releases This Week)**
- **Uses**: Videos 5-10 (`homepageVideos.slice(4, 10)`)
- **Displays**:
  - Horizontal scrolling carousel
  - Video thumbnails
  - Video titles
  - Category/series name
  - Play button overlay on hover
  - Left/right navigation arrows

## Video Order

**Important**: The order you select videos matters!

- **1st video** → Hero section (featured)
- **Videos 2-5** → "Tendencias Ahora" section
- **Videos 6-11** → "Novedades esta semana" section

**Note**: If you select fewer videos:
- If only 1 video: Only shows in Hero section
- If 2-4 videos: Hero + "Tendencias Ahora" (no "Novedades")
- If 5+ videos: All sections populated

## Technical Details

### Database Storage
- Setting key: `homepage_video_ids`
- Setting group: `homepage`
- Value format: JSON array of video IDs, e.g., `[1, 5, 12, 23, 45]`

### Frontend Flow
1. Admin selects videos → Saved to `homepage_video_ids` setting
2. Homepage loads → Fetches `homepage_video_ids` from settings
3. Frontend fetches video details for each ID
4. Videos are displayed in the 3 sections based on their position in the array

### Video Requirements
- Only **published** videos can be selected and displayed
- Videos must have valid IDs
- If a video is deleted or unpublished, it won't appear (but ID remains in settings)

## Example

**If you select videos with IDs: [10, 20, 30, 40, 50, 60]**

**Homepage will show**:
- **Hero**: Video #10
- **Tendencias Ahora**: Videos #20, #30, #40, #50
- **Novedades**: Videos #60 (only one, since slice(4, 10) gets items 5-10)

## Troubleshooting

**Videos not showing on homepage?**
1. Check if videos are published (draft videos won't show)
2. Check browser console for errors
3. Verify `homepage_video_ids` setting exists in database
4. Check if video IDs in setting match actual video IDs

**Wrong order?**
- Re-select videos in the desired order (selection order = display order)

**Sections empty?**
- Make sure you've selected enough videos:
  - Hero: 1+ videos
  - Tendencias: 2+ videos
  - Novedades: 5+ videos

