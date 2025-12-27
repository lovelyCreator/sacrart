import { useState, useEffect } from 'react';
import { heroBackgroundApi } from '@/services/heroBackgroundApi';
import { settingsApi } from '@/services/settingsApi';

/**
 * Hook to fetch and use hero background images
 * Returns an array of hero image URLs
 */
export const useHeroImages = () => {
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        setLoading(true);
        
        // Method 1: Fetch from hero_backgrounds table (preferred)
        try {
          const response = await heroBackgroundApi.getPublic();
          if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
            const urls = response.data
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(bg => bg.image_url || bg.image_path)
              .filter((url): url is string => Boolean(url) && url.trim() !== '');
            
            // Convert relative URLs to absolute
            const getImageUrl = (url: string): string => {
              if (!url || url.trim() === '') return '';
              if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
              }
              const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
              const origin = String(API_BASE_URL).replace(/\/?api\/?$/, '').trim();
              return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
            };
            
            setHeroImages(urls.map(getImageUrl));
            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Failed to fetch from hero_backgrounds table:', error);
        }
        
        // Method 2: Fallback to site_settings
        try {
          const settingsResponse = await settingsApi.getPublicSettings();
          if (settingsResponse?.success && settingsResponse.data?.hero_background_images) {
            const images = JSON.parse(settingsResponse.data.hero_background_images);
            if (Array.isArray(images) && images.length > 0) {
              const urls = images
                .map((img: any) => img.url)
                .filter((url: string) => url && url.trim() !== '');
              
              const getImageUrl = (url: string): string => {
                if (!url || url.trim() === '') return '';
                if (url.startsWith('http://') || url.startsWith('https://')) {
                  return url;
                }
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
                const origin = String(API_BASE_URL).replace(/\/?api\/?$/, '').trim();
                return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
              };
              
              setHeroImages(urls.map(getImageUrl));
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to fetch from site_settings:', error);
        }
        
        // No hero images found
        setHeroImages([]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching hero images:', error);
        setHeroImages([]);
        setLoading(false);
      }
    };

    fetchHeroImages();
  }, []);

  return { heroImages, loading };
};

/**
 * Get a single hero image by index (rotates through available images)
 */
export const useHeroImage = (index: number = 0) => {
  const { heroImages, loading } = useHeroImages();
  const image = heroImages.length > 0 ? heroImages[index % heroImages.length] : null;
  return { image, loading, hasImages: heroImages.length > 0 };
};



