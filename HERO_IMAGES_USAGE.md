# Hero Images Usage Guide

## Where Hero Images Are Currently Displayed

### 1. **Landing Page (Before Login)** - `frontend/src/pages/Home.tsx`
**Location:** Line 1392
```tsx
// Fixed background for landing page
<div 
  className="absolute inset-0 bg-cover bg-center"
  style={{
    backgroundImage: `url('${getSetting('hero_background_image', 'default-url')}')`
  }}
/>
```

### 2. **Homepage Hero Section (After Login)** - `frontend/src/pages/Home.tsx`
**Location:** Line 2088
```tsx
// Main hero background image
const heroBgImage = heroVideo?.intro_image_url || heroBgUrls[0] || heroSettings.hero_background_images?.[0];
<div 
  className="w-full h-full bg-cover bg-center bg-no-repeat" 
  style={{
    backgroundImage: `url('${heroBgImage ? getImageUrl(heroBgImage) : 'default'}')`
  }}
/>
```

### 3. **Poster Collage** - `frontend/src/pages/Home.tsx`
**Location:** Line 426-484
- Uses hero images in a collage format
- Rotates through available hero images

## How to Use Hero Images in Any Component

### Option 1: Using the Custom Hook (Recommended)

```tsx
import { useHeroImages, useHeroImage } from '@/utils/useHeroImages';

// Get all hero images
const MyComponent = () => {
  const { heroImages, loading } = useHeroImages();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {heroImages.map((url, index) => (
        <img key={index} src={url} alt={`Hero ${index + 1}`} />
      ))}
    </div>
  );
};

// Get a single hero image by index
const MyOtherComponent = () => {
  const { image, loading, hasImages } = useHeroImage(0);
  
  if (loading) return <div>Loading...</div>;
  if (!hasImages) return <div>No hero images available</div>;
  
  return (
    <div 
      style={{
        backgroundImage: `url('${image}')`
      }}
    >
      Content here
    </div>
  );
};
```

### Option 2: Direct API Call

```tsx
import { heroBackgroundApi } from '@/services/heroBackgroundApi';
import { settingsApi } from '@/services/settingsApi';

const MyComponent = () => {
  const [heroImages, setHeroImages] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchImages = async () => {
      // Method 1: From hero_backgrounds table
      const response = await heroBackgroundApi.getPublic();
      if (response?.success && response.data) {
        const urls = response.data
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(bg => bg.image_url || bg.image_path)
          .filter(Boolean);
        setHeroImages(urls);
      }
      
      // Method 2: From site_settings (fallback)
      // const settings = await settingsApi.getPublicSettings();
      // if (settings.data?.hero_background_images) {
      //   const images = JSON.parse(settings.data.hero_background_images);
      //   setHeroImages(images.map(img => img.url));
      // }
    };
    
    fetchImages();
  }, []);
  
  return (
    <div>
      {heroImages.map((url, i) => (
        <img key={i} src={url} alt={`Hero ${i + 1}`} />
      ))}
    </div>
  );
};
```

### Option 3: From Settings (Public Settings)

```tsx
import { settingsApi } from '@/services/settingsApi';

const MyComponent = () => {
  const [heroImage, setHeroImage] = useState<string>('');
  
  useEffect(() => {
    const fetchSettings = async () => {
      const response = await settingsApi.getPublicSettings();
      if (response?.success && response.data) {
        // Single hero background image
        if (response.data.hero_background_image) {
          setHeroImage(response.data.hero_background_image);
        }
        
        // Or multiple hero background images
        if (response.data.hero_background_images) {
          const images = JSON.parse(response.data.hero_background_images);
          if (Array.isArray(images) && images.length > 0) {
            setHeroImage(images[0].url);
          }
        }
      }
    };
    
    fetchSettings();
  }, []);
  
  return (
    <div style={{ backgroundImage: `url('${heroImage}')` }}>
      Content
    </div>
  );
};
```

## Common Use Cases

### 1. Background Image
```tsx
<div 
  className="bg-cover bg-center"
  style={{
    backgroundImage: `url('${heroImage}')`
  }}
>
  Content
</div>
```

### 2. Image Carousel/Slider
```tsx
const { heroImages } = useHeroImages();
// Use with any carousel library (Swiper, etc.)
```

### 3. Gallery Grid
```tsx
const { heroImages } = useHeroImages();
<div className="grid grid-cols-4 gap-4">
  {heroImages.map((url, i) => (
    <img key={i} src={url} className="w-full h-48 object-cover" />
  ))}
</div>
```

### 4. Rotating Background
```tsx
const { heroImages } = useHeroImages();
const [currentIndex, setCurrentIndex] = useState(0);

useEffect(() => {
  if (heroImages.length > 0) {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }
}, [heroImages]);

<div style={{ backgroundImage: `url('${heroImages[currentIndex]}')` }}>
  Content
</div>
```

## Data Sources Priority

1. **hero_backgrounds table** (via `heroBackgroundApi.getPublic()`) - Primary source
2. **site_settings table** (via `settingsApi.getPublicSettings()`) - Fallback
   - Key: `hero_background_images` (JSON array)
   - Key: `hero_background_image` (single image)

## Notes

- Hero images are stored in the `hero_backgrounds` table with `sort_order` for ordering
- Images can be uploaded via Admin Settings → Hero tab → Background Images section
- Up to 16 hero image slots are available
- Images are automatically converted to absolute URLs if they're relative paths



