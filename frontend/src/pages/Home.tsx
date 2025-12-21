import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Star, 
  Clock, 
  Users, 
  TrendingUp, 
  Calendar,
  BookOpen,
  Award,
  Zap,
  Crown,
  ChevronRight,
  Check,
  Plus,
  X,
  ChevronLeft,
  Brush,
  Heart,
  Film,
  Languages,
  Monitor,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { generateMockSeries, generateMockVideos, MockSeries } from '@/services/mockData';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import CourseHeroSection from '@/components/CourseHeroSection';
import { faqApi, Faq } from '@/services/faqApi';
import { settingsApi } from '@/services/settingsApi';
import { categoryApi, Category, seriesApi, videoApi } from '@/services/videoApi';
import { feedbackApi, Feedback } from '@/services/feedbackApi';
import { subscriptionPlanApi, SubscriptionPlan } from '@/services/subscriptionPlanApi';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useLanguage } from '@/hooks/useLanguage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import cover1 from '@/assets/cover1.webp';
import cover2 from '@/assets/cover2.webp';
import cover3 from '@/assets/cover3.webp';
import cover4 from '@/assets/cover4.webp';
import cover5 from '@/assets/cover5.webp';
import cover6 from '@/assets/cover6.webp';
import cover7 from '@/assets/cover7.webp';
import cover8 from '@/assets/cover8.webp';
import logoSA from '@/assets/logoSA-negro.png';

const Home = () => {
  const [popularSeries, setPopularSeries] = useState<MockSeries[]>([]);
  const [newSeries, setNewSeries] = useState<MockSeries[]>([]);
  const [recommendedSeries, setRecommendedSeries] = useState<MockSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0); // Start at first category tab
  const [faqs, setFaqs] = useState<Record<string, Faq[]>>({});
  const [faqLoading, setFaqLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [seriesByCategory, setSeriesByCategory] = useState<Record<number, any[]>>({});
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [testimonials, setTestimonials] = useState<Feedback[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(false);
  const [featuredCourse, setFeaturedCourse] = useState<any>(null);
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [heroSettings, setHeroSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [homepageVideos, setHomepageVideos] = useState<any[]>([]);
  const [homepageVideosLoading, setHomepageVideosLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const homepageVideosCarouselRef = useRef<HTMLDivElement>(null);
  
  // Landing page data (for unauthenticated users)
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [landingSettings, setLandingSettings] = useState<Record<string, any>>({});
  const [landingSettingsLoading, setLandingSettingsLoading] = useState(true);

  // Helper function to parse features from description (one feature per line)
  const parseFeatures = (description: string | undefined | null): string[] => {
    if (!description) return [];
    // Split by newlines and filter out empty lines
    return description
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // Helper function to get features from plan (handles both features array and description)
  const getPlanFeatures = (plan: SubscriptionPlan): string[] => {
    let features: string[] = [];
    
    // First, try to get features from the features field
    if (plan.features) {
      if (Array.isArray(plan.features)) {
        features = plan.features;
      } else if (typeof plan.features === 'string') {
        try {
          const parsed = JSON.parse(plan.features);
          features = Array.isArray(parsed) ? parsed : [];
        } catch {
          // If not JSON, treat as single feature
          features = [plan.features];
        }
      }
    }
    
    // If no features from features field, try parsing from description
    if (features.length === 0 && plan.description) {
      features = parseFeatures(plan.description);
    }
    
    // Add feature flags from plan settings
    const planFeatures: string[] = [];
    
    // Max Devices
    if (plan.max_devices) {
      planFeatures.push(`${plan.max_devices} ${plan.max_devices === 1 ? 'Device' : 'Devices'}`);
    }
    
    // Video Quality
    if (plan.video_quality) {
      planFeatures.push(`${plan.video_quality} Quality`);
    }
    
    // Downloadable Content
    if (plan.downloadable_content) {
      planFeatures.push('Downloadable Content');
    }
    
    // Certificates
    if (plan.certificates) {
      planFeatures.push('Certificates of Completion');
    }
    
    // Priority Support
    if (plan.priority_support) {
      planFeatures.push('Priority Support');
    }
    
    // Ad Free
    if (plan.ad_free) {
      planFeatures.push('Ad-Free Experience');
    }
    
    // Combine custom features with plan features
    return [...features, ...planFeatures];
  };
  const [showVideosLeftArrow, setShowVideosLeftArrow] = useState(false);
  const [showVideosRightArrow, setShowVideosRightArrow] = useState(true);
  const [shouldCenterVideos, setShouldCenterVideos] = useState(false);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, updateUser, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { navigateWithLocale, getPathWithLocale, locale } = useLocale();
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  // Bunny.net stream base URL for direct MP4 previews (e.g. https://your-stream-zone.b-cdn.net)
  const BUNNY_STREAM_BASE = import.meta.env.VITE_BUNNY_STREAM_URL || '';

  const getBunnyPreviewUrl = (video: any): string | null => {
    if (!video) return null;
    // If backend ever stores a direct MP4 URL, prefer that
    if (video.bunny_video_url && (video.bunny_video_url as string).startsWith('http')) {
      return video.bunny_video_url;
    }
    // Otherwise, build from bunny_video_id + Bunny stream base
    if (!video.bunny_video_id) return null;
    if (!BUNNY_STREAM_BASE) {
      console.warn('[Homepage preview] VITE_BUNNY_STREAM_URL is not set, skipping video preview.');
      return null;
    }
    const base = BUNNY_STREAM_BASE.replace(/\/+$/, '');
    return `${base}/${video.bunny_video_id}/play_720p.mp4`;
  };

  const handleGetStarted = () => {
    if (email.trim()) {
      // Store email for later use in signup flow
      localStorage.setItem('signup_email', email);
      navigate("/auth", { state: { email: email } });
    } else {
      navigate("/auth");
    }
  };

  const handleCourseClick = (courseId: number) => {
    navigateWithLocale(`/series/${courseId}`);
  };

  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    navigateWithLocale(`/category/${categoryId}`);
  };

  const centerActiveTab = (tabIndex: number, instant: boolean = false) => {
    if (tabContainerRef.current) {
      const container = tabContainerRef.current;
      const activeButton = container.querySelector(`[data-tab-index="${tabIndex}"]`) as HTMLElement;
      
      if (activeButton && activeButton.offsetWidth > 0) {
        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerRect = container.getBoundingClientRect();
        
        // Get active button dimensions and position relative to container
        const buttonRect = activeButton.getBoundingClientRect();
        const buttonLeft = buttonRect.left - containerRect.left + container.scrollLeft;
        const buttonWidth = buttonRect.width;
        
        // Calculate the scroll position to center the button
        const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
        
        // Ensure scroll position is within bounds
        const maxScroll = container.scrollWidth - containerWidth;
        const finalScrollLeft = Math.max(0, Math.min(scrollLeft, maxScroll));
        
        // Scroll to center the active tab (instant on first load, smooth on interactions)
        container.scrollTo({
          left: finalScrollLeft,
          behavior: instant ? 'auto' : 'smooth'
        });
        
        return true; // Successfully centered
      }
      return false; // Tab not ready yet
    }
    return false;
  };

  const handleTabClick = (index: number) => {
    const currentTab = tabData[index];
    if (!currentTab) {
      return;
    }
    setActiveTab(index);
    // Use setTimeout to ensure the DOM has updated, with smooth scrolling
    setTimeout(() => centerActiveTab(index, false), 50);
  };

  // Center the active tab when it changes
  useEffect(() => {
    if (tabContainerRef.current && categories.length > 0) {
      // Use requestAnimationFrame to ensure all layout calculations are complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Additional delay to ensure tabs are fully rendered and have their widths calculated
          setTimeout(() => {
            centerActiveTab(activeTab, true);
          }, 150);
        });
      });
    }
  }, [activeTab]);

  // Center the active tab when categories first load
  useEffect(() => {
    if (tabContainerRef.current && categories.length > 0) {
      let attempts = 0;
      const maxAttempts = 20; // Try up to 20 times
      
      const tryCenter = () => {
        attempts++;
        const centered = centerActiveTab(activeTab, true);
        
        if (!centered && attempts < maxAttempts) {
          // Tab not ready yet, try again
          requestAnimationFrame(tryCenter);
        }
      };
      
      // Start trying after a small initial delay
      const initialTimer = setTimeout(() => {
        requestAnimationFrame(tryCenter);
      }, 50);

      return () => {
        clearTimeout(initialTimer);
      };
    }
  }, [categories]);

  // Center active tab on window resize
  useEffect(() => {
    const handleResize = () => {
      if (tabContainerRef.current) {
        centerActiveTab(activeTab, true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Handle scroll to seguir-viendo section when hash is present
  useEffect(() => {
    // Only scroll if hash is present (user clicked "Seguir Viendo")
    if (location.hash === '#seguir-viendo') {
      // Wait for the component to fully render
      const scrollToSection = () => {
        const element = document.getElementById('seguir-viendo');
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          // Remove hash from URL after scrolling to prevent re-scrolling on re-render
          window.history.replaceState(null, '', location.pathname);
        } else {
          // Element not found yet, try again after a short delay
          setTimeout(scrollToSection, 100);
        }
      };
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(scrollToSection, 100);
      });
    }
    // If no hash, browser will naturally keep scroll position at top (no action needed)
  }, [location.hash, location.pathname]);

  const toggleFaq = (faqId: number) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };


  // Featured hero content
  const heroContent = {
    id: 1,
    title: "Sculpting Mastery",
    description: "Witness the artistry behind incredible sculpting techniques and restoration processes",
    image: cover1,
    videoCount: 12,
    duration: "4h 30m",
    viewers: 1234,
    rating: 4.8,
    visibility: "premium"
  };

  // Helper to construct full URL if needed (defined early for use in useEffect)
  const getImageUrl = (src: string) => {
    if (!src || !src.trim()) return cover1;
    // If it's already a full URL, return as is
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    // If it starts with /storage or /, construct full URL
    if (src.startsWith('/storage/') || src.startsWith('/')) {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://72.61.297.64:8000';
      return `${API_BASE_URL.replace('/api', '')}${src}`;
    }
    // If it's a relative path without leading slash, construct full URL
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://72.61.297.64:8000';
    return `${API_BASE_URL.replace('/api', '')}/${src.replace(/^\//, '')}`;
  };

  // HBO Max style poster collage data - pulled from DB when available
  const [heroBgUrls, setHeroBgUrls] = useState<string[]>([]);

  useEffect(() => {
    // Fetch public hero backgrounds from DB
    const fetchHeroBackgrounds = async () => {
      try {
        const { heroBackgroundApi } = await import('@/services/heroBackgroundApi');
        const resp = await heroBackgroundApi.getPublic();
        if (resp?.success && Array.isArray(resp.data) && resp.data.length > 0) {
          const urls = resp.data
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(bg => {
              const url = bg.image_url || bg.image_path;
              // Construct full URL if needed, add cache-busting parameter
              if (url && url.trim()) {
                const fullUrl = getImageUrl(url);
                // Add timestamp to prevent caching
                const finalUrl = fullUrl.includes('?') 
                  ? `${fullUrl}&t=${Date.now()}` 
                  : `${fullUrl}?t=${Date.now()}`;
                return finalUrl;
              }
              return null;
            })
            .filter((url): url is string => Boolean(url) && url.trim() !== '');
          setHeroBgUrls(urls);
        } else {
          // If no backgrounds found, clear the state
          setHeroBgUrls([]);
        }
      } catch (e) {
        // Silent fallback to defaults
        console.warn('Hero backgrounds fetch failed; using defaults', e);
        setHeroBgUrls([]);
      }
    };

    fetchHeroBackgrounds();
    
    // Refetch every 30 seconds to get new uploads (optional, but helpful)
    const interval = setInterval(fetchHeroBackgrounds, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // HBO Max style poster collage data - now configurable from admin
  const getPosterCollage = () => {
    const defaultCollage = [
      { src: cover1, alt: t('general.sculpting_series'), rotation: -8, x: 10, y: 15 },
      { src: cover2, alt: t('general.art_techniques'), rotation: 12, x: 25, y: 5 },
      { src: cover3, alt: t('general.master_classes'), rotation: -5, x: 45, y: 20 },
      { src: cover4, alt: t('general.restoration'), rotation: 8, x: 65, y: 10 },
      { src: cover5, alt: t('general.behind_scenes'), rotation: -12, x: 80, y: 25 },
      { src: cover6, alt: t('general.professional_tips'), rotation: 6, x: 15, y: 35 },
      { src: cover7, alt: t('general.creative_process'), rotation: -10, x: 35, y: 40 },
      { src: cover8, alt: t('general.expert_insights'), rotation: 9, x: 55, y: 35 },
      { src: cover1, alt: t('general.studio_sessions'), rotation: -7, x: 75, y: 45 },
      { src: cover2, alt: t('general.art_history'), rotation: 11, x: 5, y: 55 },
      { src: cover3, alt: t('general.modern_art'), rotation: -9, x: 30, y: 60 },
      { src: cover4, alt: t('general.classical_techniques'), rotation: 7, x: 60, y: 55 },
      { src: cover5, alt: t('general.digital_art'), rotation: -11, x: 85, y: 65 },
      { src: cover6, alt: t('general.traditional_methods'), rotation: 5, x: 20, y: 75 },
      { src: cover7, alt: t('general.contemporary_art'), rotation: -6, x: 50, y: 75 },
      { src: cover8, alt: t('general.artistic_vision'), rotation: 10, x: 70, y: 80 }
    ];

    // Prefer database hero backgrounds if available
    if (heroBgUrls.length > 0) {
      return defaultCollage.map((d, index) => {
        const dbUrl = heroBgUrls[index % heroBgUrls.length];
        // Only use database URL if it's valid and not empty
        const finalSrc = (dbUrl && dbUrl.trim()) ? dbUrl : d.src;
        return {
          src: finalSrc,
          alt: `${t('general.background')} ${index + 1}`,
          rotation: d.rotation,
          x: d.x,
          y: d.y,
        };
      });
    }

    // Otherwise, if hero settings have background images, use them
    if (heroSettings.hero_background_images) {
      try {
        const customImages = JSON.parse(heroSettings.hero_background_images);
        if (Array.isArray(customImages) && customImages.length > 0) {
          return customImages.map((img, index) => ({
            src: img.url ? getImageUrl(img.url) : defaultCollage[index % defaultCollage.length].src,
            alt: img.alt || `${t('general.background')} ${index + 1}`,
            rotation: img.rotation || defaultCollage[index % defaultCollage.length].rotation,
            x: img.x || defaultCollage[index % defaultCollage.length].x,
            y: img.y || defaultCollage[index % defaultCollage.length].y
          }));
        }
      } catch (error) {
        console.error('Error parsing hero background images:', error);
      }
    }

    return defaultCollage;
  };

  // Make posterCollage reactive to heroBgUrls and heroSettings changes
  const posterCollage = useMemo(() => getPosterCollage(), [heroBgUrls, heroSettings, t]);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const allSeries = generateMockSeries();
      setPopularSeries(allSeries.slice(0, 6));
      setNewSeries(allSeries.slice(1, 7));
      setRecommendedSeries(allSeries.slice(2, 8));
      setLoading(false);
    };

    fetchData();
  }, []);

  // Fetch FAQs from backend
  useEffect(() => {
    const fetchFaqs = async () => {
      setFaqLoading(true);
      try {
        const response = await faqApi.getFaqs(undefined, locale);
        // Keep the grouped structure for category display
        setFaqs(response.data);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
        // Fallback to empty state if API fails
        setFaqs({});
      } finally {
        setFaqLoading(false);
      }
    };

    fetchFaqs();
  }, [locale]); // Refetch when locale changes

  // Fetch subscription plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      try {
        const response = await subscriptionPlanApi.getPublic();
        if (response?.success && Array.isArray(response.data)) {
          // Sort plans: freemium, basic, premium
          const sortedPlans = response.data.sort((a, b) => {
            const order = { freemium: 0, basic: 1, premium: 2 };
            const aOrder = order[a.name.toLowerCase() as keyof typeof order] ?? 999;
            const bOrder = order[b.name.toLowerCase() as keyof typeof order] ?? 999;
            return aOrder - bOrder;
          });
          setSubscriptionPlans(sortedPlans);
        }
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        setSubscriptionPlans([]);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, [locale]); // Refetch when locale changes

  // Fetch Hero Settings from backend
  useEffect(() => {
    const fetchHeroSettings = async () => {
      setSettingsLoading(true);
      try {
        const response = await settingsApi.getPublicSettings();
        if (response.success) {
          console.log('Hero settings loaded:', response.data);
          console.log('About image URL:', response.data.about_image);
          setHeroSettings(response.data);
        }
      } catch (error) {
        console.error('Error fetching hero settings:', error);
        // Fallback to default values if API fails
        setHeroSettings({
          hero_title: t('hero.title'),
          hero_subtitle: t('hero.subtitle'),
          hero_cta_text: t('hero.cta_text'),
          hero_price: '€9.99/month',
          hero_cta_button_text: t('hero.cta_button'),
          hero_disclaimer: t('hero.disclaimer')
        });
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchHeroSettings();
  }, []);

  // Fetch landing page data (for unauthenticated users)
  useEffect(() => {
    if (!isAuthenticated) {
      // Fetch trending videos
      const fetchTrendingVideos = async () => {
        setVideosLoading(true);
        try {
          const response = await videoApi.getPublic({
            status: 'published',
            sort_by: 'views',
            sort_order: 'desc',
            per_page: 20 // Get more videos for the carousel
          });
          const videosData = response.data?.data || response.data || [];
          setTrendingVideos(Array.isArray(videosData) ? videosData : []);
        } catch (error) {
          console.error('Error fetching trending videos:', error);
          setTrendingVideos([]);
        } finally {
          setVideosLoading(false);
        }
      };

      // Fetch landing settings
      const fetchLandingSettings = async () => {
        setLandingSettingsLoading(true);
        try {
          const response = await settingsApi.getPublicSettings();
          if (response.success && response.data) {
            setLandingSettings(response.data);
          }
        } catch (error) {
          console.error('Error fetching landing settings:', error);
          setLandingSettings({});
        } finally {
          setLandingSettingsLoading(false);
        }
      };

      fetchTrendingVideos();
      fetchLandingSettings();
    }
  }, [isAuthenticated, locale]);

  // Handle payment success/cancel callbacks from Stripe
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      // Payment successful - refresh user data to get updated subscription
      const refreshUser = async () => {
        try {
          const response = await api.getUser();
          if (response.user) {
            updateUser(response.user);
            toast.success(t('subscription.payment_success') || 'Payment successful! Your subscription is now active.');
          }
        } catch (error) {
          console.error('Error refreshing user after payment:', error);
          toast.success(t('subscription.payment_success') || 'Payment successful!');
        }
      };
      refreshUser();
      
      // Clean up URL
      searchParams.delete('payment');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    } else if (paymentStatus === 'cancel') {
      toast.error(t('subscription.payment_cancelled') || 'Payment was cancelled.');
      
      // Clean up URL
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, updateUser, t]);

  // Fetch Categories and Series from backend
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await categoryApi.getPublic(locale);
        if (response.success) {
          const cats = response.data || [];
          setCategories(cats);
          // Set activeTab to first category
          if (cats.length > 0) {
            setActiveTab(0);
          }
          
          // Fetch series for each category
          if (cats.length > 0) {
            await fetchSeriesForCategories(cats);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [locale]); // Refetch when locale changes

  // Fetch videos for all categories
  const fetchSeriesForCategories = async (cats: Category[]) => {
    setSeriesLoading(true);
    try {
      const videosPromises = cats.map(async (category) => {
        try {
          const response = await videoApi.getPublic({
            category_id: category.id,
            status: 'published',
            per_page: 10
          });
          // Handle both paginated and non-paginated responses
          const videosData = response.data?.data || response.data;
          const videos = Array.isArray(videosData) ? videosData : [];
          
          // Transform videos to match the expected series format
          const series = videos.map((video: any) => {
            // Prioritize full URLs from model accessors, then fallback to raw paths
            const imageUrl = video.intro_image_url 
              || getImageUrl(video.intro_image || cover1);
            
            return {
              id: video.id,
              title: video.title,
              subtitle: video.short_description || video.description || '',
              image: imageUrl,
              videoCount: 1, // Each video is a single item
              duration: `${Math.floor((video.duration || 0) / 60)}m`,
              viewers: video.views || 0,
              rating: parseFloat(video.rating || '0'),
              visibility: video.visibility || 'freemium'
            };
          });
          
          return { categoryId: category.id, series };
        } catch (error) {
          console.error(`Error fetching videos for category ${category.id}:`, error);
          return { categoryId: category.id, series: [] };
        }
      });

      const results = await Promise.all(videosPromises);
      const seriesMap: Record<number, any[]> = {};
      results.forEach(({ categoryId, series }) => {
        seriesMap[categoryId] = series;
      });
      setSeriesByCategory(seriesMap);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setSeriesLoading(false);
    }
  };

  // Fetch Featured Videos (videos with most reviews/comments)
  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      setFeaturedLoading(true);
      try {
        // Fetch videos sorted by comment count (reviews), fallback to views if no comments
        const response = await videoApi.getPublic({
          status: 'published',
          sort_by: 'reviews',
          sort_order: 'desc',
          per_page: 6
        });
        
        const videosData = response.data?.data || response.data;
        const videos = Array.isArray(videosData) ? videosData : [];
        
        if (videos.length > 0) {
          // Use first video as featured course
          const firstVideo = videos[0];
          setFeaturedCourse({
            id: firstVideo.id,
            title: firstVideo.title,
            description: firstVideo.short_description || firstVideo.description || '',
            video: firstVideo, // Include full video object for preview
            image: getImageUrl(firstVideo.thumbnail_url || firstVideo.intro_image_url || firstVideo.thumbnail || firstVideo.intro_image || cover1),
            category: firstVideo.category?.name || t('general.uncategorized'),
            duration: `${Math.floor((firstVideo.duration || 0) / 60)}m`,
            rating: parseFloat(firstVideo.rating || '0'),
            studentsCount: firstVideo.views || 0,
            instructor: firstVideo.instructor?.name || t('general.instructor'),
            comments_count: (firstVideo as any).comments_count || 0,
            views: firstVideo.views || 0
          });
          
          // Use remaining videos as featured courses
          const remainingVideos = videos.slice(1).map((video: any) => ({
            id: video.id,
            title: video.title,
            video: video, // Include full video object for preview
            image: getImageUrl(video.thumbnail_url || video.intro_image_url || video.thumbnail || video.intro_image || cover1),
            duration: `${Math.floor((video.duration || 0) / 60)}m`,
            rating: parseFloat(video.rating || '0'),
            studentsCount: video.views || 0,
            instructor: video.instructor?.name || t('general.instructor'),
            category: video.category?.name || t('general.uncategorized'),
            comments_count: (video as any).comments_count || 0
          }));
          
          setFeaturedCourses(remainingVideos);
        } else {
          // Fallback: Fetch videos sorted by views if no videos with comments
          const fallbackResponse = await videoApi.getPublic({
            status: 'published',
            sort_by: 'views',
            sort_order: 'desc',
            per_page: 6
          });
          
          const fallbackData = fallbackResponse.data?.data || fallbackResponse.data;
          const fallbackVideos = Array.isArray(fallbackData) ? fallbackData : [];
          
          if (fallbackVideos.length > 0) {
            const firstVideo = fallbackVideos[0];
            setFeaturedCourse({
              id: firstVideo.id,
              title: firstVideo.title,
              description: firstVideo.short_description || firstVideo.description || '',
              video: firstVideo,
              image: getImageUrl(firstVideo.thumbnail_url || firstVideo.intro_image_url || firstVideo.thumbnail || firstVideo.intro_image || cover1),
              category: firstVideo.category?.name || 'Uncategorized',
              duration: `${Math.floor((firstVideo.duration || 0) / 60)}m`,
              rating: parseFloat(firstVideo.rating || '0'),
              studentsCount: firstVideo.views || 0,
              instructor: firstVideo.instructor?.name || 'Instructor',
            comments_count: (firstVideo as any).comments_count || 0,
            views: firstVideo.views || 0
            });
            
            const remainingVideos = fallbackVideos.slice(1).map((video: any) => ({
              id: video.id,
              title: video.title,
              video: video,
              image: getImageUrl(video.thumbnail_url || video.intro_image_url || video.thumbnail || video.intro_image || cover1),
              duration: `${Math.floor((video.duration || 0) / 60)}m`,
              rating: parseFloat(video.rating || '0'),
              studentsCount: video.views || 0,
              instructor: video.instructor?.name || t('general.instructor'),
              category: video.category?.name || t('general.uncategorized'),
              comments_count: (video as any).comments_count || 0
            }));
            
            setFeaturedCourses(remainingVideos);
          }
        }
      } catch (error) {
        console.error('Error fetching featured videos:', error);
      } finally {
        setFeaturedLoading(false);
      }
    };

    fetchFeaturedVideos();
  }, [locale]);

  // Fetch Testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      setTestimonialsLoading(true);
      try {
        // Get selected testimonials from settings
        const selectedIds = heroSettings.homepage_testimonial_ids;
        let testimonialIds: number[] = [];
        
        if (selectedIds) {
          try {
            testimonialIds = JSON.parse(selectedIds);
          } catch (e) {
            console.error('Error parsing homepage_testimonial_ids:', e);
          }
        }

        // Fetch all approved testimonials (using feedback with type 'general_feedback')
        const response = await feedbackApi.getAll({ type: 'general_feedback', status: 'resolved' });
        if (response.success) {
          let allTestimonials = response.data?.data || response.data || [];
          
          // Filter to show only selected testimonials if any are selected
          if (testimonialIds.length > 0) {
            allTestimonials = allTestimonials.filter((t: Feedback) => testimonialIds.includes(t.id));
          }
          
          setTestimonials(allTestimonials);
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        setTestimonials([]);
      } finally {
        setTestimonialsLoading(false);
      }
    };

    // Only fetch when heroSettings is loaded
    if (Object.keys(heroSettings).length > 0) {
      fetchTestimonials();
    }
  }, [heroSettings]);

  // Fetch Homepage Videos (selected videos for carousel)
  useEffect(() => {
    const fetchHomepageVideos = async () => {
      setHomepageVideosLoading(true);
      try {
        // Get selected video IDs from settings
        const selectedIds = heroSettings.homepage_video_ids;
        let videoIds: number[] = [];
        
        if (selectedIds) {
          try {
            videoIds = typeof selectedIds === 'string' ? JSON.parse(selectedIds) : selectedIds;
          } catch (e) {
            console.error('Error parsing homepage_video_ids:', e);
          }
        }

        // If no videos selected, don't fetch
        if (videoIds.length === 0) {
          setHomepageVideos([]);
          setHomepageVideosLoading(false);
          return;
        }

        console.log('Fetching homepage videos, selected IDs:', videoIds, 'Total IDs:', videoIds.length);

        // Fetch all published videos with high limit
        const publicResponse = await videoApi.getPublic({ 
          status: 'published', 
          per_page: 1000,
          sort_by: 'created_at',
          sort_order: 'desc'
        });
        
        const responseData = publicResponse.data;
        const videosData = responseData?.data || [];
        const allPublicVideos = Array.isArray(videosData) ? videosData : [];
        
        console.log('Total published videos fetched:', allPublicVideos.length);
        console.log('Pagination info:', {
          current_page: responseData?.current_page,
          last_page: responseData?.last_page,
          total: responseData?.total
        });

        // Filter to only selected videos and maintain order
        const validVideos = videoIds
          .map(id => {
            const video = allPublicVideos.find((v: any) => v.id === id);
            if (!video) {
              console.warn(`Video ${id} not found in published videos`);
              return null;
            }
            return {
              id: video.id,
              title: video.title,
              video: video,
              image: getImageUrl(video.thumbnail_url || video.intro_image_url || video.thumbnail || video.intro_image || cover1),
              duration: `${Math.floor((video.duration || 0) / 60)}m`,
              rating: parseFloat(video.rating || '0'),
              studentsCount: video.views || 0,
              instructor: video.instructor?.name || t('general.instructor'),
              category: video.category?.name || t('general.uncategorized'),
            };
          })
          .filter(v => v !== null);

        console.log('Fetched homepage videos:', validVideos.length, 'out of', videoIds.length, 'selected');
        if (validVideos.length < videoIds.length) {
          console.warn('Some videos were not found. Missing IDs:', 
            videoIds.filter(id => !allPublicVideos.find((v: any) => v.id === id))
          );
        }

        setHomepageVideos(validVideos);
      } catch (error) {
        console.error('Error fetching homepage videos:', error);
        setHomepageVideos([]);
      } finally {
        setHomepageVideosLoading(false);
      }
    };

    // Only fetch when heroSettings is loaded
    if (Object.keys(heroSettings).length > 0) {
      fetchHomepageVideos();
    }
  }, [heroSettings]);

  // Check if homepage videos carousel should be centered and show/hide arrows
  useEffect(() => {
    const checkCenterVideos = () => {
      if (homepageVideosCarouselRef.current) {
        const container = homepageVideosCarouselRef.current;
        const containerWidth = container.clientWidth;
        const contentWidth = container.scrollWidth;
        
        // If content fits within container, center it
        setShouldCenterVideos(contentWidth <= containerWidth);
        
        // Check arrow visibility
        setShowVideosLeftArrow(container.scrollLeft > 0);
        setShowVideosRightArrow(
          container.scrollLeft < contentWidth - containerWidth - 10
        );
      }
    };

    checkCenterVideos();
    
    // Check on window resize and when videos change
    const handleResize = () => {
      checkCenterVideos();
    };
    window.addEventListener('resize', handleResize);
    
    // Also check on scroll
    const handleScroll = () => {
      checkCenterVideos();
    };
    if (homepageVideosCarouselRef.current) {
      homepageVideosCarouselRef.current.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (homepageVideosCarouselRef.current) {
        homepageVideosCarouselRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [homepageVideos]);

  const scrollVideosCarousel = (direction: 'left' | 'right') => {
    if (homepageVideosCarouselRef.current) {
      const scrollAmount = homepageVideosCarouselRef.current.clientWidth * 0.8;
      const newScrollLeft = homepageVideosCarouselRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      homepageVideosCarouselRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });

      setTimeout(() => {
        if (homepageVideosCarouselRef.current) {
          setShowVideosLeftArrow(homepageVideosCarouselRef.current.scrollLeft > 0);
          setShowVideosRightArrow(
            homepageVideosCarouselRef.current.scrollLeft < homepageVideosCarouselRef.current.scrollWidth - homepageVideosCarouselRef.current.clientWidth - 10
          );
        }
      }, 300);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'premium':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'basic':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'freemium':
        return <Zap className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    const colors = {
      premium: 'bg-yellow-100 text-yellow-800',
      basic: 'bg-blue-100 text-blue-800',
      freemium: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[visibility as keyof typeof colors]}`}>
        {getVisibilityIcon(visibility)}
        <span className="ml-1 capitalize">{visibility}</span>
      </span>
    );
  };


  // Transform categories from database to courseCategories format
  const courseCategories = categories.map((category) => {
    // Get image from category's URL fields (from backend accessors) or raw fields, fallback to default
    // Priority: image_url > cover_image_url > thumbnail_url > image > cover_image > thumbnail
    const categoryImage = category.image_url 
      || category.cover_image_url 
      || category.thumbnail_url 
      || category.image 
      || category.cover_image 
      || category.thumbnail;
    // If it's already a full URL (from accessors), use it directly; otherwise construct URL
    const imageUrl = categoryImage 
      ? (categoryImage.startsWith('http') || categoryImage.startsWith('/') 
          ? categoryImage 
          : getImageUrl(categoryImage)) 
      : cover1;
    
    return {
      id: category.id,
      title: category.name,
      image: imageUrl,
      courseCount: (category as any).videos_count || 0,
      description: category.description || category.short_description || '',
      category: category.name
    };
  });

  const SeriesCard = ({ series }: { series: any }) => {
    const imageSrc = series.image || cover1;
    const finalImageUrl = getImageUrl(imageSrc);

    return (
      <Card className="group cursor-pointer overflow-visible border-0 bg-transparent transform hover:scale-105 transition-all duration-300 hover:shadow-2xl" onClick={() => navigateWithLocale(`/series/${series.id}`)}>
        <div className="aspect-[3/2] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 relative overflow-hidden rounded-lg shadow-lg">
          {/* Background Image */}
          <img
            src={finalImageUrl}
            alt={series.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              // Fallback to default cover if image fails to load
              const target = e.target as HTMLImageElement;
              if (target.src !== cover1) {
                target.src = cover1;
              }
            }}
          />
          {/* Bottom Gradient Overlay - HBO Max Style */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
          
          {/* Series Title */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <h3 className="font-bold text-sm line-clamp-2 drop-shadow-lg group-hover:text-white transition-colors duration-300">
              {series.title}
            </h3>
            {series.subtitle && (
              <p className="text-xs text-white/80 mt-1 line-clamp-1">
                {series.subtitle}
              </p>
            )}
          </div>
          
          {/* HBO Max Style Hover Effect */}
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/30 rounded-lg transition-all duration-300"></div>
        </div>
      </Card>
    );
  };

  // Sample content for each category - HBO Max Style
  const sculptureSeries = [
    { id: 1, title: "MICHELANGELO'S SECRETS", subtitle: "Behind the David", image: cover1, videoCount: 12, duration: "4h 30m", viewers: 1234, rating: 4.8, visibility: "premium" },
    { id: 2, title: "MODERN ABSTRACT", subtitle: "Breaking Boundaries", image: cover2, videoCount: 8, duration: "3h 15m", viewers: 987, rating: 4.6, visibility: "basic" },
    { id: 3, title: "CLAY MASTERY", subtitle: "From Mud to Masterpiece", image: cover3, videoCount: 15, duration: "6h 45m", viewers: 2156, rating: 4.9, visibility: "premium" },
    { id: 4, title: "STONE CARVING", subtitle: "Ancient Techniques", image: cover4, videoCount: 10, duration: "5h 20m", viewers: 1456, rating: 4.7, visibility: "basic" },
    { id: 5, title: "BRONZE CASTING", subtitle: "The Lost Art", image: cover5, videoCount: 7, duration: "3h 50m", viewers: 876, rating: 4.5, visibility: "premium" },
    { id: 6, title: "FIGURATIVE ART", subtitle: "Human Form Study", image: cover6, videoCount: 11, duration: "4h 10m", viewers: 1689, rating: 4.8, visibility: "basic" },
    { id: 7, title: "RELIEF TECHNIQUES", subtitle: "Depth in Stone", image: cover7, videoCount: 9, duration: "3h 25m", viewers: 1123, rating: 4.6, visibility: "freemium" },
    { id: 8, title: "PUBLIC ART", subtitle: "City Transformations", image: cover8, videoCount: 6, duration: "2h 45m", viewers: 654, rating: 4.4, visibility: "basic" },
    { id: 9, title: "ANATOMY STUDIES", subtitle: "Perfect Proportions", image: cover1, videoCount: 13, duration: "5h 30m", viewers: 1890, rating: 4.9, visibility: "premium" },
    { id: 10, title: "DIGITAL SCULPTING", subtitle: "Future of Art", image: cover2, videoCount: 14, duration: "6h 15m", viewers: 2234, rating: 4.8, visibility: "premium" }
  ];

  const drawingSeries = [
    { id: 11, title: "PENCIL MASTERY", subtitle: "Portrait Techniques", image: cover3, videoCount: 12, duration: "4h 30m", viewers: 1234, rating: 4.8, visibility: "premium" },
    { id: 12, title: "CHARCOAL LANDSCAPES", subtitle: "Atmospheric Drawing", image: cover4, videoCount: 8, duration: "3h 15m", viewers: 987, rating: 4.6, visibility: "basic" },
    { id: 13, title: "INK WASH MASTERY", subtitle: "Eastern Techniques", image: cover5, videoCount: 15, duration: "6h 45m", viewers: 2156, rating: 4.9, visibility: "premium" },
    { id: 14, title: "PERSPECTIVE DRAWING", subtitle: "3D on Paper", image: cover6, videoCount: 10, duration: "5h 20m", viewers: 1456, rating: 4.7, visibility: "basic" },
    { id: 15, title: "LIFE DRAWING", subtitle: "Human Anatomy", image: cover7, videoCount: 7, duration: "3h 50m", viewers: 876, rating: 4.5, visibility: "premium" },
    { id: 16, title: "SKETCHBOOK HABITS", subtitle: "Daily Practice", image: cover8, videoCount: 11, duration: "4h 10m", viewers: 1689, rating: 4.8, visibility: "basic" },
    { id: 17, title: "DIGITAL ILLUSTRATION", subtitle: "Modern Art", image: cover1, videoCount: 9, duration: "3h 25m", viewers: 1123, rating: 4.6, visibility: "freemium" },
    { id: 18, title: "ARCHITECTURAL SKETCHING", subtitle: "Building Dreams", image: cover2, videoCount: 6, duration: "2h 45m", viewers: 654, rating: 4.4, visibility: "basic" },
    { id: 19, title: "MANGA & COMICS", subtitle: "Storytelling Art", image: cover3, videoCount: 13, duration: "5h 30m", viewers: 1890, rating: 4.9, visibility: "premium" },
    { id: 20, title: "STILL LIFE STUDIES", subtitle: "Object Mastery", image: cover4, videoCount: 14, duration: "6h 15m", viewers: 2234, rating: 4.8, visibility: "premium" }
  ];

  const polychromySeries = [
    { id: 21, title: "COLOR THEORY", subtitle: "The Science of Art", image: cover5, videoCount: 12, duration: "4h 30m", viewers: 1234, rating: 4.8, visibility: "premium" },
    { id: 22, title: "OIL PAINTING", subtitle: "Classical Mastery", image: cover6, videoCount: 8, duration: "3h 15m", viewers: 987, rating: 4.6, visibility: "basic" },
    { id: 23, title: "ACRYLIC TECHNIQUES", subtitle: "Modern Methods", image: cover7, videoCount: 15, duration: "6h 45m", viewers: 2156, rating: 4.9, visibility: "premium" },
    { id: 24, title: "WATERCOLOR MASTERY", subtitle: "Fluid Art", image: cover8, videoCount: 10, duration: "5h 20m", viewers: 1456, rating: 4.7, visibility: "basic" },
    { id: 25, title: "FRESCO PAINTING", subtitle: "Ancient Wisdom", image: cover1, videoCount: 7, duration: "3h 50m", viewers: 876, rating: 4.5, visibility: "premium" },
    { id: 26, title: "GILDING TECHNIQUES", subtitle: "Golden Touch", image: cover2, videoCount: 11, duration: "4h 10m", viewers: 1689, rating: 4.8, visibility: "basic" },
    { id: 27, title: "ENAMEL ART", subtitle: "Fire and Color", image: cover3, videoCount: 9, duration: "3h 25m", viewers: 1123, rating: 4.6, visibility: "freemium" },
    { id: 28, title: "ICON PAINTING", subtitle: "Sacred Art", image: cover4, videoCount: 6, duration: "2h 45m", viewers: 654, rating: 4.4, visibility: "basic" },
    { id: 29, title: "MURAL ART", subtitle: "Public Masterpieces", image: cover5, videoCount: 13, duration: "5h 30m", viewers: 1890, rating: 4.9, visibility: "premium" },
    { id: 30, title: "ABSTRACT PAINTING", subtitle: "Beyond Reality", image: cover6, videoCount: 14, duration: "6h 15m", viewers: 2234, rating: 4.8, visibility: "premium" }
  ];

  const restorationSeries = [
    { id: 31, title: "PAINTING RESTORATION", subtitle: "Bringing Art Back", image: cover7, videoCount: 12, duration: "4h 30m", viewers: 1234, rating: 4.8, visibility: "premium" },
    { id: 32, title: "SCULPTURE REPAIR", subtitle: "Ancient to Modern", image: cover8, videoCount: 8, duration: "3h 15m", viewers: 987, rating: 4.6, visibility: "basic" },
    { id: 33, title: "TEXTILE CONSERVATION", subtitle: "Fabric Preservation", image: cover1, videoCount: 15, duration: "6h 45m", viewers: 2156, rating: 4.9, visibility: "premium" },
    { id: 34, title: "PAPER RESTORATION", subtitle: "Document Recovery", image: cover2, videoCount: 10, duration: "5h 20m", viewers: 1456, rating: 4.7, visibility: "basic" },
    { id: 35, title: "CERAMIC MENDING", subtitle: "Broken to Beautiful", image: cover3, videoCount: 7, duration: "3h 50m", viewers: 876, rating: 4.5, visibility: "premium" },
    { id: 36, title: "WOOD RESTORATION", subtitle: "Timber Revival", image: cover4, videoCount: 11, duration: "4h 10m", viewers: 1689, rating: 4.8, visibility: "basic" },
    { id: 37, title: "METAL PATINATION", subtitle: "Age with Grace", image: cover5, videoCount: 9, duration: "3h 25m", viewers: 1123, rating: 4.6, visibility: "freemium" },
    { id: 38, title: "HISTORICAL ARTIFACTS", subtitle: "Time Travel", image: cover6, videoCount: 6, duration: "2h 45m", viewers: 654, rating: 4.4, visibility: "basic" },
    { id: 39, title: "PREVENTIVE CONSERVATION", subtitle: "Future Protection", image: cover7, videoCount: 13, duration: "5h 30m", viewers: 1890, rating: 4.9, visibility: "premium" },
    { id: 40, title: "DIGITAL RESTORATION", subtitle: "Tech Meets Art", image: cover8, videoCount: 14, duration: "6h 15m", viewers: 2234, rating: 4.8, visibility: "premium" }
  ];

  const modelingSeries = [
    { id: 41, title: "BLENDER BASICS", subtitle: "3D for Everyone", image: cover1, videoCount: 12, duration: "4h 30m", viewers: 1234, rating: 4.8, visibility: "premium" },
    { id: 42, title: "ZBRUSH SCULPTING", subtitle: "Digital Clay", image: cover2, videoCount: 8, duration: "3h 15m", viewers: 987, rating: 4.6, visibility: "basic" },
    { id: 43, title: "MAYA CHARACTER DESIGN", subtitle: "Bringing Life", image: cover3, videoCount: 15, duration: "6h 45m", viewers: 2156, rating: 4.9, visibility: "premium" },
    { id: 44, title: "SUBSTANCE PAINTER", subtitle: "Texturing Mastery", image: cover4, videoCount: 10, duration: "5h 20m", viewers: 1456, rating: 4.7, visibility: "basic" },
    { id: 45, title: "ARCHITECTURAL VISUALIZATION", subtitle: "Building Dreams", image: cover5, videoCount: 7, duration: "3h 50m", viewers: 876, rating: 4.5, visibility: "premium" },
    { id: 46, title: "GAME ASSET CREATION", subtitle: "Gaming Industry", image: cover6, videoCount: 11, duration: "4h 10m", viewers: 1689, rating: 4.8, visibility: "basic" },
    { id: 47, title: "HARD SURFACE MODELING", subtitle: "Mechanical Art", image: cover7, videoCount: 9, duration: "3h 25m", viewers: 1123, rating: 4.6, visibility: "freemium" },
    { id: 48, title: "ORGANIC MODELING", subtitle: "Living Forms", image: cover8, videoCount: 6, duration: "2h 45m", viewers: 654, rating: 4.4, visibility: "basic" },
    { id: 49, title: "RENDERING TECHNIQUES", subtitle: "Light and Shadow", image: cover1, videoCount: 13, duration: "5h 30m", viewers: 1890, rating: 4.9, visibility: "premium" },
    { id: 50, title: "ANIMATION PRINCIPLES", subtitle: "Movement Mastery", image: cover2, videoCount: 14, duration: "6h 15m", viewers: 2234, rating: 4.8, visibility: "premium" }
  ];

  // Generate tab data from database categories
  const generateTabData = () => {
    const categoryTabs = categories.map((category, index) => {
      // Get series data from backend for this category
      const seriesData = seriesByCategory[category.id] || [];

      return {
        id: category.id,
        title: category.name.toUpperCase(),
        icon: TrendingUp,
        summary: category.description || t('general.discover_amazing_content'),
        description: category.description || t('general.explore_curated_collection'),
        features: [t('general.expert_content'), t('general.professional_techniques'), t('general.quality_learning')],
        backgroundImage: cover1,
        series: seriesData
      };
    });

    return categoryTabs;
  };

  const tabData = generateTabData();

  const TabbedCarousel = () => {
    const currentTab = tabData[activeTab];
    
    // Show loading state if categories are still loading
    if (categoriesLoading || categories.length === 0) {
      return (
        <section className="mb-16 lg:mb-20">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 text-xl">{t('general.loading_categories')}</div>
          </div>
        </section>
      );
    }
    
    return (
      <section className="mb-16 lg:mb-20">
        {/* HBO Max Style Header with Tab Navigation */}
        
        
        {/* Tab Navigation - HBO Max Style - Arrows aligned with content ends */}
        <div className="flex items-center justify-between mb-8 lg:mb-12 w-full max-w-6xl mx-auto">
          {/* Left Arrow - Aligned to content left */}
          <button 
            onClick={() => {
              const newIndex = activeTab - 1;
              if (newIndex >= 0) {
                handleTabClick(newIndex);
              }
            }}
            className="text-gray-400 hover:text-white transition-colors duration-300 p-4 flex-shrink-0"
          >
            <ChevronRight className="h-8 w-8 rotate-180" />
          </button>
          
          {/* Tab Labels - Show all tabs in single row */}
          <div 
            ref={tabContainerRef}
            className="flex items-center space-x-6 lg:space-x-8 overflow-x-auto hide-scrollbar w-full flex-nowrap"
          >
            {tabData.map((tab, index) => (
              <button
                key={tab.id}
                data-tab-index={index}
                onClick={() => handleTabClick(index)}
                className={`text-2xl lg:text-3xl xl:text-4xl font-light transition-colors duration-300 flex-shrink-0 whitespace-nowrap ${
                  index === activeTab
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.title}
              </button>
            ))}
          </div>
          
          {/* Right Arrow - Aligned to content right */}
          <button 
            onClick={() => {
              const newIndex = activeTab + 1;
              if (newIndex < tabData.length) {
                handleTabClick(newIndex);
              }
            }}
            className="text-gray-400 hover:text-white transition-colors duration-300 p-4 flex-shrink-0"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
        
        {/* HBO Max Style Grid - Single Row with Arrow Navigation */}
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex items-center">
            
            {/* Content Grid */}
            <div 
              className="content-grid grid grid-flow-col grid-rows-1 gap-6 lg:gap-8 overflow-x-auto hide-scrollbar py-4 flex-1"
            >
              {currentTab.series.map((item) => (
                <div key={item.id} className="w-72 md:w-80 lg:w-96 flex-shrink-0 hover:z-50 transition-all duration-300 group">
                  <SeriesCard series={item} />
                </div>
              ))}
            </div>
            
           
          </div>
        </div>
    </section>
  );
  };

  // Helper functions for landing page
  const formatPrice = (price: number | string | null | undefined): string => {
    if (price === null || price === undefined || price === '') return '0.00';
    const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
    if (isNaN(numPrice) || !isFinite(numPrice)) return '0.00';
    return numPrice.toFixed(2);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    const carousel = document.getElementById('trending-carousel');
    if (carousel) {
      // Calculate scroll amount based on container width and gap
      const containerWidth = carousel.clientWidth;
      const gap = 24; // gap-6 = 24px
      // Each video takes (containerWidth - 3*gap) / 4
      const videoWidth = (containerWidth - 3 * gap) / 4;
      const scrollAmount = videoWidth + gap; // Scroll by one video + gap
      
      carousel.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Format video duration from seconds to readable format
  const formatVideoDuration = (seconds: number | string | null | undefined): string => {
    if (!seconds) return '';
    const numSeconds = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
    if (isNaN(numSeconds) || numSeconds <= 0) return '';
    
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    const secs = numSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs > 0 ? `${secs}s` : ''}`;
    } else {
      return `${secs}s`;
    }
  };

  const getSetting = (key: string, defaultValue: string = ''): string => {
    const value = landingSettings[key];
    // Only return if it's a string, otherwise return default
    if (value && typeof value === 'string') {
      return value;
    }
    // If it's an object, don't try to render it
    if (value && typeof value === 'object') {
      return defaultValue;
    }
    return defaultValue;
  };

  // Ensure dark mode is applied for landing page
  useEffect(() => {
    if (!isAuthenticated) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
  }, [isAuthenticated]);

  // Render landing page for unauthenticated users
  const renderLandingPage = () => {
    return (
      <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden antialiased selection:bg-primary selection:text-white">
        {/* Fixed Background */}
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${getSetting('hero_background_image', 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop')}')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/90 to-background-dark/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 via-transparent to-background-dark/80" />
        </div>

        {/* Header */}
        <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background-dark/80 backdrop-blur-md transition-all duration-300">
          <div className="mx-auto flex h-16 sm:h-20 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                alt="SACRART Logo"
                src={logoSA}
                className="h-8 sm:h-10 md:h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/')}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-white/90 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded transition-all h-9 sm:h-10">
                    <i className="fa-solid fa-globe text-sm"></i>
                    <span className="text-xs font-medium uppercase hidden sm:inline">
                      {languages.find(lang => lang.code === currentLanguage)?.code?.toUpperCase() || currentLanguage.toUpperCase()}
                    </span>
                    <i className="fa-solid fa-chevron-down text-[10px]"></i>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#181113] border-white/10 text-white w-40">
                  {languages.length > 0 ? (
                    languages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10 ${
                          currentLanguage === lang.code ? 'bg-white/5 text-primary' : ''
                        }`}
                      >
                        <span className="text-base">{lang.flag || '🌐'}</span>
                        <span className="flex-1">{lang.native || lang.name}</span>
                        {currentLanguage === lang.code && (
                          <i className="fa-solid fa-check text-primary text-sm"></i>
                        )}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    // Fallback languages if API hasn't loaded yet
                    [
                      { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
                      { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
                      { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
                    ].map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10 ${
                          currentLanguage === lang.code ? 'bg-white/5 text-primary' : ''
                        }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="flex-1">{lang.native}</span>
                        {currentLanguage === lang.code && (
                          <span className="text-primary">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
                className="flex h-9 sm:h-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 sm:px-5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                <span className="hidden sm:inline">{t('common.sign_in')}</span>
                <span className="sm:hidden">{t('common.sign_in').split(' ')[0]}</span>
              </Button>
              <Button
                onClick={() => navigate('/auth')}
                className="flex h-9 sm:h-10 items-center justify-center rounded-lg bg-primary px-3 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-[#8a4539]"
              >
                {t('common.sign_up')}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Hero Section */}
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pb-12 sm:pb-20 pt-24 sm:pt-32 lg:pt-20">
          <div className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-2">
              {/* Left Content */}
              <div className="flex flex-col gap-4 sm:gap-6 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary mx-auto lg:mx-0">
                  <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 sm:h-2 w-1.5 sm:w-2 bg-primary" />
                  </span>
                  <span className="hidden sm:inline">{getSetting('hero_badge', t('index.hero.badge', 'Nueva Masterclass Disponible'))}</span>
                  <span className="sm:hidden">{getSetting('hero_badge', t('index.hero.badge', 'Nueva Masterclass Disponible')).split(' ')[0]}</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight text-white">
                  {getSetting('hero_title', t('index.hero.title', 'EL ARTE DE'))} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                    {getSetting('hero_subtitle', t('index.hero.subtitle', 'LO DIVINO'))}
                  </span>
                </h1>

                {/* Description */}
                <p className="mx-auto max-w-xl text-base sm:text-lg font-medium text-gray-300 lg:mx-0 lg:text-xl">
                  {getSetting('hero_description', t('index.hero.description', 'La primera plataforma de streaming dedicada exclusivamente a la enseñanza y apreciación del arte religioso. Aprende técnicas centenarias de los maestros.'))}
                </p>

                {/* CTA Buttons */}
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 lg:justify-start">
                  <Button
                    onClick={() => navigate('/auth')}
                    className="flex h-12 sm:h-14 w-full sm:w-auto min-w-[200px] items-center justify-center gap-2 rounded-lg bg-primary px-6 sm:px-8 text-sm sm:text-base font-bold text-white shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                    <span className="hidden sm:inline">{t('index.hero.cta_subscribe', 'Suscribirse ahora')}</span>
                    <span className="sm:hidden">{t('index.hero.cta_subscribe', 'Suscribirse ahora').split(' ')[0]}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateWithLocale('/browse')}
                    className="flex h-12 sm:h-14 w-full sm:w-auto min-w-[200px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 sm:px-8 text-sm sm:text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                  >
                    {t('index.hero.cta_catalog', 'Ver catálogo')}
                  </Button>
                </div>

                {/* Stats Grid */}
                <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-y-6 sm:gap-y-8 gap-x-6 sm:gap-x-12 border-t border-white/10 pt-6 sm:pt-8 w-full max-w-lg mx-auto lg:mx-0">
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-white">{getSetting('hero_stat_1_value', '500+')}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{getSetting('hero_stat_1_label', t('index.hero.stat_1', 'Horas de contenido'))}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-white">{getSetting('hero_stat_2_value', '4K')}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{getSetting('hero_stat_2_label', t('index.hero.stat_2', 'Ultra Alta Definición'))}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-white">{getSetting('hero_stat_3_value', 'Escultora Ana Rey')}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{getSetting('hero_stat_3_label', t('index.hero.stat_3', 'Artista Principal'))}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-white">{getSetting('hero_stat_4_value', '400k+')}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{getSetting('hero_stat_4_label', t('index.hero.stat_4', 'Seguidores en redes'))}</span>
                  </div>
                </div>
              </div>

              {/* Right Featured Video Card (Desktop Only) */}
              <div className="hidden lg:flex lg:justify-end">
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-orange-700 opacity-25 blur transition duration-1000 group-hover:opacity-75 group-hover:duration-200" />
                  <div className="relative h-[500px] w-[380px] overflow-hidden rounded-xl bg-surface-dark border border-border-dark shadow-2xl">
                    <div 
                      className="absolute inset-0 h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{
                        backgroundImage: `url('${trendingVideos[0]?.thumbnail_url ? getImageUrl(trendingVideos[0].thumbnail_url) : 'https://images.unsplash.com/photo-1576504677634-06b2130bd1f3?q=80&w=1974&auto=format&fit=crop'}')`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-white backdrop-blur-sm shadow-xl">
                        <Play className="h-8 w-8 ml-1" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-6">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">{t('index.hero.featured_badge', 'NUEVO')}</span>
                        <span className="text-xs font-medium text-gray-300">{trendingVideos[0]?.series_title || t('index.hero.featured_series', 'Temporada 1')}</span>
                      </div>
                      <h3 className="mb-1 text-2xl font-bold text-white">
                        {typeof trendingVideos[0]?.title === 'string' ? trendingVideos[0].title : t('index.hero.featured_title', 'Técnicas de Dorado')}
                      </h3>
                      <p className="line-clamp-2 text-sm text-gray-300">
                        {typeof trendingVideos[0]?.description === 'string' ? trendingVideos[0].description : t('index.hero.featured_description', 'Descubre los secretos del pan de oro y las técnicas de estofado utilizadas en el siglo XVII.')}
                      </p>
                      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/20">
                        <div className="h-full w-1/3 bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Why SACRART Section */}
        <section className="relative z-10 border-t border-white/5 bg-background-dark/50 backdrop-blur-sm py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{t('index.why_sacrart.title', '¿Por qué SACRART?')}</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-400 px-4">{t('index.why_sacrart.description', 'Sumérgete en el conocimiento ancestral del arte sacro desde cualquier dispositivo.')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
              <div className="group rounded-xl border border-border-dark bg-surface-dark/50 p-6 sm:p-8 transition-colors hover:bg-surface-dark hover:border-primary/50">
                <div className="mb-4 inline-flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Brush className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="mb-2 text-lg sm:text-xl font-bold text-white">{t('index.why_sacrart.artist_title', 'Para el Artista o Aprendiz')}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-gray-400">{t('index.why_sacrart.artist_description', 'Que busca perfeccionar su técnica, aprender métodos tradicionales y modernos y encontrar inspiración en una artista que abre las puertas de su taller.')}</p>
              </div>
              <div className="group rounded-xl border border-border-dark bg-surface-dark/50 p-6 sm:p-8 transition-colors hover:bg-surface-dark hover:border-primary/50">
                <div className="mb-4 inline-flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Heart className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="mb-2 text-lg sm:text-xl font-bold text-white">{t('index.why_sacrart.art_lover_title', 'Para el Apasionado del Arte')}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-gray-400">{t('index.why_sacrart.art_lover_description', 'Que disfruta viendo nacer y crecer una imagen, sin necesidad de practicar: solo curiosidad y emoción por el proceso.')}</p>
              </div>
            </div>
            <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              <div className="group rounded-xl border border-border-dark bg-surface-dark/50 p-4 sm:p-6 transition-colors hover:bg-surface-dark hover:border-primary/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="inline-flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Film className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{t('index.why_sacrart.quality_title', 'Calidad 4K HDR')}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400">{t('index.why_sacrart.quality_description', 'No pierdas detalle de cada pincelada.')}</p>
                  </div>
                </div>
              </div>
              <div className="group rounded-xl border border-border-dark bg-surface-dark/50 p-4 sm:p-6 transition-colors hover:bg-surface-dark hover:border-primary/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="inline-flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Languages className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{t('index.why_sacrart.multilang_title', 'Multilenguaje')}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400">{t('index.why_sacrart.multilang_description', 'Doblados y subtitulados al inglés y portugués.')}</p>
                  </div>
                </div>
              </div>
              <div className="group rounded-xl border border-border-dark bg-surface-dark/50 p-4 sm:p-6 transition-colors hover:bg-surface-dark hover:border-primary/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="inline-flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{t('index.why_sacrart.platform_title', 'Multiplataforma')}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400">{t('index.why_sacrart.platform_description', 'Web, tablet y móvil.')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Plans Section */}
        <section className="relative z-10 border-t border-white/5 bg-background-dark py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="mb-8 sm:mb-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('index.plans.title', 'Elige tu Plan')}</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-400 px-4">{t('index.plans.description', 'Únete a la comunidad de arte sacro más grande del mundo')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 items-end">
              {plansLoading ? (
                <div className="col-span-3 text-center text-gray-400">{t('common.loading')}</div>
              ) : subscriptionPlans.length > 0 ? (
                subscriptionPlans.map((plan, index) => {
                  const features = getPlanFeatures(plan);
                  const isPopular = plan.name.toLowerCase() === 'basic';
                  const isPremium = plan.name.toLowerCase() === 'premium';
                  
                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col h-full rounded-xl sm:rounded-2xl border ${isPopular ? 'border-2 border-primary bg-surface-dark lg:scale-105 z-10' : 'border-border-dark bg-surface-dark/30'} p-6 sm:p-8 shadow-lg transition-transform hover:-translate-y-1 relative`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 sm:px-4 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white shadow-md">
                          {t('index.plans.popular', 'Más Popular')}
                        </div>
                      )}
                      <h3 className="text-lg sm:text-xl font-bold text-white">{plan.display_name || plan.name}</h3>
                      <div className="mt-3 sm:mt-4 flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-white">
                          {plan.name.toLowerCase() === 'freemium' ? t('index.plans.free', 'Gratis') : `€${formatPrice(plan.price)}`}
                        </span>
                        {plan.name.toLowerCase() !== 'freemium' && (
                          <span className="text-sm sm:text-base text-gray-400">/mes</span>
                        )}
                      </div>
                      <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">{plan.description || ''}</p>
                      <ul className="mt-6 sm:mt-8 mb-6 sm:mb-8 flex flex-col gap-2 sm:gap-3 flex-grow">
                        {features.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300">
                            {isPremium ? (
                              <Star className={`text-orange-400 text-[16px] sm:text-[20px]`} fill="currentColor" />
                            ) : (
                              <CheckCircle2 className={`${isPopular ? 'text-primary' : 'text-gray-500'} text-[16px] sm:text-[20px]`} />
                            )}
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => navigate('/auth')}
                        className={`mt-auto w-full rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white transition-colors ${
                          isPopular
                            ? 'bg-primary hover:bg-[#8a4539] shadow-lg shadow-primary/25'
                            : 'border border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {plan.name.toLowerCase() === 'freemium'
                          ? t('index.plans.cta_free', 'Registrarse Gratis')
                          : t('index.plans.cta_choose', 'Elegir Plan', { plan: plan.display_name || plan.name })}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center text-gray-400">{t('index.plans.no_plans', 'No hay planes disponibles')}</div>
              )}
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="relative z-10 border-t border-white/5 bg-background-dark/50 backdrop-blur-sm py-12 sm:py-16">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="mb-6 sm:mb-10 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('index.trending.title', 'Trending en SACRART')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
            {videosLoading ? (
              <div className="text-center text-gray-400 text-sm sm:text-base">{t('common.loading')}</div>
            ) : trendingVideos.length > 0 ? (
              <div className="relative">
                <div
                  id="trending-carousel"
                  className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {trendingVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => navigate('/auth')}
                      className="flex-shrink-0 snap-start rounded-lg bg-surface-dark overflow-hidden border border-white/5 group cursor-pointer hover:border-primary/50 transition-colors w-[calc((100%-36px)/2)] sm:w-[calc((100%-48px)/3)] md:w-[calc((100%-72px)/4)] min-w-[200px] sm:min-w-[240px] md:min-w-[280px]"
                    >
                      <div className="relative aspect-video w-full bg-gray-800">
                        <img
                          alt={video.title || 'Video thumbnail'}
                          src={getImageUrl(video.thumbnail_url || video.intro_image_url || '')}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white">
                            {formatVideoDuration(video.duration)}
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-primary transition-colors line-clamp-2">
                          {typeof video.title === 'string' ? video.title : ''}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-1">
                          {(typeof video.instructor === 'string' ? video.instructor : (video.instructor && typeof video.instructor === 'object' ? video.instructor.name : '')) || (typeof video.series_title === 'string' ? video.series_title : '') || ''} {video.episode_number ? `• Ep. ${video.episode_number}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm sm:text-base">{t('index.trending.no_videos', 'No hay videos disponibles')}</div>
            )}
          </div>
        </section>

        {/* Sobre Ana Rey Section */}
        <section className="relative z-10 border-t border-white/5 bg-background-dark py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-xl sm:rounded-2xl border border-border-dark bg-surface-dark/50 shadow-2xl">
              <div className="grid grid-cols-1 items-center lg:grid-cols-2">
                <div className="h-full w-full relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-background-dark/20 to-transparent z-10" />
                  <img
                    alt={t('index.about.ana_rey_image_alt', 'Ana Rey trabajando en una escultura')}
                    className="h-full min-h-[300px] sm:min-h-[400px] w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    src={getSetting('about_image', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCP3XaE1D6DBXIoP-vyVcoJi6m3H2S_Sn7WOWwvQHLRf5b2rsKArv9EPpH82yyLEYQCRgA3E5I0NbwWszYst20KB2koDVGlrS_8R_DxVcERAcjo0GFNk8-yHtGUmUe8ZuHIobotfwAWdR1G5i5Q2iCAtokysx8wOezlxSvoQJHSBOakpj4MJxJdD4csypcy7Vak--j8V6Wv_EW05lqrgT_e0hEQQu2e4UCn9ML2FrPuk5HiWAUTCODrcYbNvhIz84BwvsKGuAcJuQ4')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
                    }}
                  />
                </div>
                <div className="flex flex-col gap-4 sm:gap-6 p-6 sm:p-8 lg:p-12">
                  <div className="w-fit rounded bg-primary/20 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
                    {t('index.about.badge', 'Artista Principal')}
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{t('index.about.title', 'Sobre Ana Rey')}</h2>
                  <div className="space-y-3 sm:space-y-4 text-gray-400 leading-relaxed text-sm sm:text-base">
                    <p>
                      {getSetting('about_text_1', t('index.about.text_1', 'Ana Rey es una reconocida escultora española especializada en imaginería religiosa realista. Con 15 años de experiencia, ha perfeccionado las técnicas de talla en madera y policromía.'))}
                    </p>
                    <p>
                      {getSetting('about_text_2', t('index.about.text_2', 'Su trabajo se caracteriza por el detalle extraordinario y la expresión emotiva que imprime en cada pieza. Combina métodos tradicionales con herramientas modernas para crear obras que trascienden lo meramente artístico.'))}
                    </p>
                    <p>
                      {getSetting('about_text_3', t('index.about.text_3', 'Galardonada con el Premio La Hornacina —tanto en la categoría del público como en la del experto—, comparte ahora su conocimiento y pasión por el arte sacro a través de SACRART, ofreciendo una perspectiva única del proceso creativo desde dentro.'))}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 sm:pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl sm:text-2xl font-bold text-white leading-none">{getSetting('about_stat_value', '+400 mil')}</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-400">{t('index.about.stat_label', 'Seguidores en redes sociales')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section - Using code.html design */}
        <section className="relative z-10 border-t border-white/5 bg-background-dark/50 backdrop-blur-sm py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-8 sm:mb-10 text-center text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              {t('faq.title', 'Preguntas Frecuentes')}
            </h2>
            {faqLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">{t('faq.loading', 'Cargando...')}</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(faqs).flatMap(([category, categoryFaqs]) =>
                  categoryFaqs.map((faq: Faq) => (
                    <details
                      key={faq.id}
                      className="group rounded-xl border border-white/5 bg-surface-dark overflow-hidden transition-all duration-300 hover:border-primary/30"
                      open={expandedFaq === faq.id}
                    >
                      <summary
                        className="flex cursor-pointer items-center justify-between p-4 sm:p-6 text-white outline-none list-none"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFaq(faq.id);
                        }}
                      >
                        <span className="font-bold text-base sm:text-lg pr-4">{faq.question}</span>
                        <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${expandedFaq === faq.id ? 'rotate-180' : ''} text-gray-400 group-hover:text-primary flex-shrink-0`} />
                      </summary>
                      {expandedFaq === faq.id && (
                        <div className="border-t border-white/5 bg-black/20 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 text-gray-400 leading-relaxed text-sm sm:text-base">
                          {faq.answer}
                        </div>
                      )}
                    </details>
                  ))
                )}
              </div>
            )}
            <div className="mt-12 sm:mt-16 rounded-xl sm:rounded-2xl border border-border-dark bg-surface-dark/30 p-6 sm:p-8 text-center">
              <h3 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-bold text-white">{t('faq.cta_title', '¿Aún tienes dudas?')}</h3>
              <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-400">{t('faq.cta_description', 'Escríbenos y estaremos encantados de atenderte')}</p>
              <Button
                onClick={() => navigate('/auth')}
                className="flex h-10 sm:h-12 w-full max-w-[200px] items-center justify-center gap-2 rounded-lg bg-primary px-6 sm:px-8 text-sm sm:text-base font-bold text-white shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95 sm:w-auto mx-auto hover:bg-[#8a4539]"
              >
                {t('faq.cta_button', 'Tengo dudas')}
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 mt-auto border-t border-white/5 bg-[#120d0f] py-8 sm:py-12">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col items-center justify-between gap-6 sm:gap-8 md:flex-row">
              <div className="flex items-center gap-2">
                <img
                  alt="SACRART Logo"
                  src={logoSA}
                  className="h-6 sm:h-8 w-auto object-contain brightness-0 invert opacity-80"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
                <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                  {t('footer.terms', 'Términos de uso')}
                </a>
                <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                  {t('footer.privacy', 'Política de privacidad')}
                </a>
                <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                  {t('footer.help', 'Centro de ayuda')}
                </a>
                <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                  {t('footer.careers', 'Trabaja con nosotros')}
                </a>
              </div>
              <div className="flex gap-3 sm:gap-4">
                {getSetting('footer_social_facebook') && (
                  <a href={getSetting('footer_social_facebook')} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <span className="sr-only">Facebook</span>
                    <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd" />
                    </svg>
                  </a>
                )}
                {getSetting('footer_social_instagram') && (
                  <a href={getSetting('footer_social_instagram')} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <span className="sr-only">Instagram</span>
                    <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.673 2.013 10.03 2 12.315 2zm-1.082 2.682c-2.316.05-3.085.12-3.864.417-.817.31-1.428.911-1.737 1.72-.3.771-.368 1.543-.418 3.864-.05 2.302-.05 2.977 0 5.28.05 2.316.118 3.085.418 3.864.31.817.92 1.428 1.737 1.737.77.299 1.543.367 3.864.417 2.301.05 2.977.05 5.279 0 2.317-.05 3.086-.118 3.865-.417.817-.31 1.428-.92 1.737-1.737.299-.77.367-1.543.417-3.864.05-2.301.05-2.977 0-5.279-.05-2.317-.118-3.086-.417-3.865-.31-.817-.92-1.428-1.737-1.737-.77-.299-1.543-.367-3.865-.417-2.301-.05-2.976-.05-5.279 0zm1.082 3.193a6.126 6.126 0 110 12.252 6.126 6.126 0 010-12.252zm0 2.16a3.966 3.966 0 100 7.932 3.966 3.966 0 000-7.932zm6.22-3.66a1.44 1.44 0 110 2.88 1.44 1.44 0 010-2.88z" fillRule="evenodd" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
            <div className="mt-8 text-center text-xs text-gray-600">
              {getSetting('footer_copyright', `© ${new Date().getFullYear()} SACRART Inc. Todos los derechos reservados.`)}
            </div>
          </div>
        </footer>
      </div>
    );
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show landing page if user is not authenticated
  if (!isAuthenticated) {
    return renderLandingPage();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark">
        <div className="w-full px-12 lg:px-16 xl:px-20 py-8">
          <div className="animate-pulse">
            {/* Carousel Loading */}
            <div className="relative h-[500px] lg:h-[600px] w-full bg-muted mb-12"></div>
            
            {/* Content Sections Loading */}
            <div className="space-y-16">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-10 bg-muted rounded w-64 mb-8"></div>
                  <div className="flex space-x-4 overflow-hidden">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="flex-shrink-0 w-72">
                        <div className="aspect-[16/9] bg-muted rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get featured video/series for hero
  const heroVideo = featuredCourse || (homepageVideos.length > 0 ? homepageVideos[0] : null);
  const heroBgImage = heroVideo?.thumbnail_url || heroVideo?.intro_image_url || heroBgUrls[0] || (heroSettings.hero_background_images ? (() => {
    try {
      const customImages = JSON.parse(heroSettings.hero_background_images);
      if (Array.isArray(customImages) && customImages.length > 0) {
        return getImageUrl(customImages[0].url || '');
      }
    } catch (e) {}
    return null;
  })() : null);

  // Get trending videos for "Tendencias Ahora" section (first 4)
  const trendingForSection = homepageVideos.slice(0, 4);

  // Get new releases for "Novedades esta semana" section
  const newReleases = homepageVideos.slice(4, 10);

  // Get featured processes (using seriesByCategory or categories)
  const featuredProcesses = Object.values(seriesByCategory).flat().slice(0, 5);

  // Get featured category for highlight section
  const featuredCategory = categories[0] || null;

  return (
    <div className="min-h-screen bg-background-dark font-display text-white overflow-x-hidden flex flex-col">
      {/* Hero Section - Based on code.html - Only image at top when login status */}
      <header className="relative w-full h-[60vh] sm:h-[70vh] md:h-[85vh] min-h-[400px] sm:min-h-[500px] md:min-h-[600px] flex items-center -mt-16 lg:-mt-20">
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat" 
            style={{
              backgroundImage: `url('${heroBgImage ? getImageUrl(heroBgImage) : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVfyR5ZlrKMKk0bXi_PlREAZwG2wlaY06GKkG7vqFruULd0d0gpN0MEF6YiBqrbSFJT9ywwTfvnbw9hEiuchbe0vyFrJQ7DWQWu7HLcMBHpDhZE9ng1i26YkG_Zt-jK_MJCbqYiTwhboc2c51KKDBRTK0njNkXpZeJWUe1fZ6YDybG3E3Qot1WQs7Hyh9R0FGYNUoT_stmSZWEt9dX2HC7GztEg0Qp8z5hTL7z-72asg1TYvAZyUShP6cXQ3Wo1CNvZdA5V-40xFk'}')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/60 to-transparent" />
        </div>
        <div className="relative z-10 w-full px-4 sm:px-6 md:px-16 pt-16 sm:pt-20 max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl animate-fade-in-up">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-primary text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white">
                {heroVideo?.category?.name || t('index.hero.badge', 'Nuevo')}
              </span>
              <span className="text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-widest">
                {t('index.hero.series_original', 'Serie Original')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[0.9] tracking-tighter text-white drop-shadow-2xl">
              {heroVideo?.title || heroSettings.hero_title || t('index.hero.title', 'El Arte de')} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600">
                {heroVideo?.category?.name || heroSettings.hero_subtitle || t('index.hero.subtitle', 'Lo Divino')}
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-200 line-clamp-3 md:line-clamp-none font-medium max-w-xl drop-shadow-md">
              {heroVideo?.description || heroSettings.hero_description || t('index.hero.description', 'Descubre los secretos ancestrales del arte sacro en esta nueva serie documental.')}
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-4">
              <Button
                onClick={() => heroVideo ? handleCourseClick(heroVideo.id) : navigateWithLocale('/browse')}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base md:text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/30"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                <span>{t('index.hero.play', 'Reproducir')}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => heroVideo ? navigateWithLocale(`/video/${heroVideo.id}`) : navigateWithLocale('/browse')}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base md:text-lg transition-colors border border-white/10"
              >
                <span className="hidden sm:inline">{t('index.hero.more_info', 'Más información')}</span>
                <span className="sm:hidden">{t('index.hero.more_info', 'Más información').split(' ')[0]}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Based on code.html */}
      <main className="relative z-20 flex-1 w-full pb-20 -mt-20 space-y-12">
        {/* Tendencias Ahora Section */}
        <section className="px-4 sm:px-6 md:px-16">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 group cursor-pointer">
            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors">
              {t('index.trending.title', 'Tendencias Ahora')}
            </h2>
            <ChevronRight className="text-primary text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0" />
          </div>
          {homepageVideosLoading ? (
            <div className="text-center text-gray-400 py-8 text-sm sm:text-base">{t('common.loading')}</div>
          ) : trendingForSection.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {trendingForSection.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleCourseClick(video.id)}
                  className="group relative bg-[#2a1d21] rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/50 hover:z-10 cursor-pointer"
                >
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={getImageUrl(video.thumbnail_url || video.intro_image_url || '')}
                      alt={video.title || ''}
                      className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
                      }}
                    />
                    {video.duration && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-bold text-white">
                        {formatVideoDuration(video.duration)}
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {video.title || ''}
                      </h3>
                      <span className="border border-white/20 rounded px-1 text-[9px] sm:text-[10px] uppercase text-gray-400 ml-2 flex-shrink-0">HD</span>
                    </div>
                    <p className="text-text-subtle text-xs sm:text-sm line-clamp-1">
                      {typeof video.instructor === 'string' ? video.instructor : (video.instructor?.name || '') || video.category?.name || ''}
                    </p>
                    <div className="mt-2 sm:mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCourseClick(video.id);
                        }}
                        className="bg-white text-black rounded-full p-1 hover:bg-primary hover:text-white transition-colors"
                      >
                        <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add to favorites/watchlist functionality
                        }}
                        className="border border-white/30 rounded-full p-1 hover:border-white transition-colors"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">{t('index.trending.no_videos', 'No hay videos disponibles')}</div>
          )}
        </section>

        {/* Seguir viendo Section */}
        <section id="seguir-viendo" className="px-4 sm:px-6 md:px-16 scroll-mt-24">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 group cursor-pointer">
            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors">
              {t('index.continue_watching.title', 'Seguir viendo')}
            </h2>
            <ChevronRight className="text-primary text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0" />
          </div>
          <div className="relative group/slider">
            <button
              onClick={() => {
                const slider = document.getElementById('continue-watching-slider');
                if (slider) slider.scrollBy({ left: -280, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-primary/90 text-white rounded-full p-1.5 sm:p-2 backdrop-blur-sm opacity-0 group-hover/slider:opacity-100 transition-all -ml-2 sm:-ml-4 shadow-lg hidden sm:block"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() => {
                const slider = document.getElementById('continue-watching-slider');
                if (slider) slider.scrollBy({ left: 280, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-primary/90 text-white rounded-full p-1.5 sm:p-2 backdrop-blur-sm opacity-0 group-hover/slider:opacity-100 transition-all -mr-2 sm:-mr-4 shadow-lg hidden sm:block"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div
              id="continue-watching-slider"
              className="flex overflow-x-auto gap-3 sm:gap-4 pb-6 sm:pb-8 snap-x snap-mandatory hide-scrollbar"
            >
              {homepageVideos.slice(0, 4).map((video, index) => {
                // Simulate progress (75%, 30%, 90%, 15%)
                const progressPercent = [75, 30, 90, 15][index] || 50;
                const remainingTime = ['15m', '42m', '5m', '55m'][index] || '30m';
                const episodeInfo = ['E1: El Comienzo', 'E4: Sombras', 'Parte 2', 'Clase 3'][index] || 'Episodio';
                
                return (
                  <div key={video.id} className="min-w-[240px] sm:min-w-[280px] md:min-w-[320px] snap-start">
                    <div
                      onClick={() => handleCourseClick(video.id)}
                      className="group relative rounded-lg overflow-hidden aspect-video mb-3 cursor-pointer bg-[#2a1d21]"
                    >
                      <img
                        src={getImageUrl(video.thumbnail_url || video.intro_image_url || '')}
                        alt={video.title || ''}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="text-white text-4xl sm:text-5xl drop-shadow-lg transform scale-50 group-hover:scale-100 transition-transform" fill="currentColor" />
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                        <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">{video.title || ''}</h3>
                    <p className="text-[10px] sm:text-xs text-text-subtle mt-1">
                      {episodeInfo} • {remainingTime} {t('index.continue_watching.remaining', 'restantes')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Formatos Exclusivos Section */}
        <section className="px-4 sm:px-6 md:px-16 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 group cursor-pointer">
            <div className="h-5 sm:h-6 w-1 bg-primary rounded-full" />
            <h2 className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-[0.2em] group-hover:text-white transition-colors">
              {t('index.formats.title', 'Formatos Exclusivos')}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { title: 'Reels', subtitle: t('index.formats.reels', 'Técnica Rápida'), image: cover1 },
              { title: 'Rewind', subtitle: t('index.formats.rewind', 'Archivo Histórico'), image: cover2 },
              { title: 'Retos', subtitle: t('index.formats.challenges', 'Desafíos Creativos'), image: cover3 },
              { title: 'Directos', subtitle: t('index.formats.live', 'Live Studio'), image: cover4, isLive: true }
            ].map((format, index) => (
              <div
                key={format.title}
                onClick={async () => {
                  if (format.title === 'Reels') {
                    navigateWithLocale('/reels');
                  } else if (format.title === 'Rewind') {
                    navigateWithLocale('/rewind');
                  } else if (format.title === 'Retos') {
                    navigateWithLocale('/challenges');
                  } else if (format.title === 'Directos') {
                    try {
                      // Fetch latest directo video
                      const response = await videoApi.getPublic({
                        status: 'published',
                        per_page: 100,
                        sort_by: 'created_at',
                        sort_order: 'desc',
                      });

                      if (response.success && response.data) {
                        const videos = Array.isArray(response.data) 
                          ? response.data 
                          : response.data?.data || [];

                        // Filter for "directos" - videos with tags containing "directo", "live", "twitch"
                        const directosVideos = videos.filter((video: any) => {
                          const tags = video.tags || [];
                          const tagString = tags.join(' ').toLowerCase();
                          return tagString.includes('directo') || 
                                 tagString.includes('live') || 
                                 tagString.includes('twitch');
                        });

                        // Navigate to latest directo video, or default to video/1 if none found
                        if (directosVideos.length > 0) {
                          navigateWithLocale(`/video/${directosVideos[0].id}`);
                        } else {
                          navigateWithLocale('/video/1');
                        }
                      } else {
                        navigateWithLocale('/video/1');
                      }
                    } catch (error) {
                      console.error('Error fetching latest directo:', error);
                      navigateWithLocale('/video/1');
                    }
                  } else {
                    navigateWithLocale('/browse');
                  }
                }}
                className="group relative aspect-[9/16] bg-[#000] rounded-sm overflow-hidden cursor-pointer shadow-2xl hover:z-10 transition-all duration-500 hover:scale-[1.02]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity duration-500 scale-100 group-hover:scale-110"
                  style={{ backgroundImage: `url('${format.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                {format.isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white">
                    <span className="size-1.5 bg-white rounded-full animate-pulse" />
                    Live
                  </div>
                )}
                <div className="absolute bottom-4 sm:bottom-8 left-0 w-full text-center z-10 p-2 sm:p-4">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-medium text-white mb-1 sm:mb-2 tracking-wide group-hover:text-primary transition-colors">
                    {format.title}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
                    {format.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Novedades esta semana Section */}
        <section className="px-4 sm:px-6 md:px-16">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 group cursor-pointer">
            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors">
              {t('index.new_releases.title', 'Novedades esta semana')}
            </h2>
            <ChevronRight className="text-primary text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0" />
          </div>
          <div className="relative group/slider">
            <button
              onClick={() => {
                const slider = document.getElementById('new-releases-slider');
                if (slider) slider.scrollBy({ left: -280, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-primary/90 text-white rounded-full p-1.5 sm:p-2 backdrop-blur-sm opacity-0 group-hover/slider:opacity-100 transition-all -ml-2 sm:-ml-4 shadow-lg hidden sm:block"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() => {
                const slider = document.getElementById('new-releases-slider');
                if (slider) slider.scrollBy({ left: 280, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-primary/90 text-white rounded-full p-1.5 sm:p-2 backdrop-blur-sm opacity-0 group-hover/slider:opacity-100 transition-all -mr-2 sm:-mr-4 shadow-lg hidden sm:block"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div
              id="new-releases-slider"
              className="flex overflow-x-auto gap-3 sm:gap-4 pb-6 sm:pb-8 snap-x snap-mandatory hide-scrollbar"
            >
              {newReleases.map((video) => (
                <div key={video.id} className="min-w-[240px] sm:min-w-[280px] md:min-w-[320px] snap-start">
                  <div
                    onClick={() => handleCourseClick(video.id)}
                    className="group relative rounded-lg overflow-hidden aspect-[16/9] mb-3 cursor-pointer"
                  >
                    <img
                      src={getImageUrl(video.thumbnail_url || video.intro_image_url || '')}
                      alt={video.title || ''}
                      className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="text-white text-5xl drop-shadow-lg transform scale-50 group-hover:scale-100 transition-transform" fill="currentColor" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white truncate">{video.title || ''}</h3>
                  <p className="text-[10px] sm:text-xs text-text-subtle mt-1">
                    {video.category?.name || video.series_title || t('index.new_releases.episode', 'Episodio')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Procesos destacados Section */}
        <section className="px-4 sm:px-6 md:px-16">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 group cursor-pointer">
            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors">
              {t('index.featured_processes.title', 'Procesos destacados')}
            </h2>
            <ChevronRight className="text-primary text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0" />
          </div>
          <div className="relative group/slider">
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 sm:pb-8 snap-x snap-mandatory hide-scrollbar">
              {featuredProcesses.slice(0, 5).map((item) => (
                <div key={item.id} className="w-[160px] sm:w-[200px] md:w-[240px] flex-shrink-0 snap-start">
                  <div
                    onClick={() => handleCategoryClick(item.category_id || item.id)}
                    className="group relative rounded-lg overflow-hidden aspect-[2/3] mb-3 cursor-pointer shadow-lg shadow-black/20"
                  >
                    <img
                      src={getImageUrl(item.cover_image || item.thumbnail_url || '')}
                      alt={item.name || item.title || ''}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = cover1;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-bold text-base md:text-lg text-white leading-tight line-clamp-2">{item.name || item.title || ''}</h3>
                      <p className="text-xs md:text-sm text-primary font-bold mt-1.5">
                        {t('index.featured_processes.new_episode', 'Nuevo Episodio')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Category Section */}
        {featuredCategory && (
          <section className="px-4 sm:px-6 md:px-16 py-6 sm:py-8">
            <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#2a1d21] border border-white/5">
              <div className="flex flex-col md:flex-row items-center">
                <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-12 flex flex-col gap-3 sm:gap-4 z-10">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">{featuredCategory.name}</h2>
                  <p className="text-text-subtle text-sm sm:text-base md:text-lg">
                    {featuredCategory.description || t('index.category.description', 'Explora esta categoría única')}
                  </p>
                  <Button
                    onClick={() => handleCategoryClick(featuredCategory.id)}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg w-fit mt-2 text-sm sm:text-base transition-colors"
                  >
                    {t('index.category.explore', 'Explorar Categoría')}
                  </Button>
                </div>
                <div
                  className="w-full md:w-1/2 h-48 sm:h-64 md:h-[400px] bg-cover bg-center relative"
                  style={{
                    backgroundImage: `url('${getImageUrl(featuredCategory.cover_image || '')}')`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2a1d21] to-transparent md:bg-gradient-to-r md:from-[#2a1d21] md:to-transparent" />
                </div>
              </div>
            </div>
          </section>
        )}
        {/* Proyectos de talla en madera Section */}
        <section className="px-4 sm:px-6 md:px-16 pb-8 sm:pb-12">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 group cursor-pointer">
            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors">
              {t('index.wood_projects.title', 'Proyectos de talla en madera')}
            </h2>
            <ChevronRight className="text-primary text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Featured large video */}
            {featuredProcesses.length > 0 && (
              <div
                onClick={() => handleCategoryClick(featuredProcesses[0].category_id || featuredProcesses[0].id)}
                className="md:col-span-2 relative group rounded-lg overflow-hidden aspect-[21/9] cursor-pointer"
              >
                <img
                  src={getImageUrl(featuredProcesses[0].cover_image || featuredProcesses[0].thumbnail_url || '')}
                  alt={featuredProcesses[0].name || featuredProcesses[0].title || ''}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = cover1;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 max-w-lg">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">{featuredProcesses[0].name || featuredProcesses[0].title || ''}</h3>
                  <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">
                    {featuredProcesses[0].description || t('index.wood_projects.description', 'Documental exclusivo sobre técnicas de talla en madera.')}
                  </p>
                </div>
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-primary text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded">
                  {t('index.wood_projects.exclusive', 'EXCLUSIVO')}
                </div>
              </div>
            )}
            {/* Side videos list */}
            <div className="flex flex-col gap-4 sm:gap-6">
              {featuredProcesses.slice(1, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleCategoryClick(item.category_id || item.id)}
                  className="flex gap-3 sm:gap-4 items-center group cursor-pointer bg-[#2a1d21]/50 p-2 sm:p-3 rounded-lg hover:bg-[#2a1d21] transition-colors"
                >
                  <div className="w-24 sm:w-32 aspect-video rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={getImageUrl(item.cover_image || item.thumbnail_url || '')}
                      alt={item.name || item.title || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = cover1;
                      }}
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <h4 className="font-bold text-white text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2">
                      {item.name || item.title || ''}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-text-subtle mt-1 line-clamp-1">
                      {item.category?.name || item.description?.substring(0, 30) || ''}
                    </p>
                  </div>
                  <div className="ml-auto pr-1 sm:pr-2 flex-shrink-0">
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white/50 group-hover:text-white transition-colors" fill="currentColor" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


      </main>
      
      {/* Old sections removed - replaced with new design */}
      {false && homepageVideos.length > 0 && (
        <section className="py-16 lg:py-24 px-4 md:px-8 bg-background-dark">
          <div className="container mx-auto max-w-7xl">
            <div className="space-y-12">
              {/* Section Title */}
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                  {t('general.featured_courses')}
                </h2>
                <p className="text-gray-400 text-xl md:text-2xl">
                  {t('general.handpicked_courses_subtitle')}
                </p>
              </div>
              
              {/* Video Carousel */}
              {homepageVideosLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-400">{t('common.loading')}</p>
                </div>
              ) : (
                <div className="relative group">
                  {/* Left Arrow */}
                  {showVideosLeftArrow && !shouldCenterVideos && (
                    <button
                      onClick={() => scrollVideosCarousel('left')}
                      className="absolute left-0 top-0 bottom-0 z-20 w-12 md:w-16 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/90"
                    >
                      <ChevronRight className="w-8 h-8 md:w-10 md:h-10 text-white rotate-180" />
                    </button>
                  )}
                  
                  {/* Video Carousel */}
                  <div 
                    ref={homepageVideosCarouselRef}
                    className={`flex space-x-8 overflow-x-auto hide-scrollbar py-4 ${shouldCenterVideos ? 'justify-center' : ''}`}
                  >
                    {homepageVideos.map((video) => {
                      const VideoCardPreview = () => {
                        const videoRef = useRef<HTMLVideoElement>(null);
                        const timeoutRef = useRef<NodeJS.Timeout | null>(null);

                        const previewSrc = getBunnyPreviewUrl(video.video);

                        const handleMouseEnter = () => {
                          if (videoRef.current && previewSrc) {
                            const vid = videoRef.current;
                            vid.currentTime = 0;
                            vid.play().catch(() => {});
                            
                            if (timeoutRef.current) {
                              clearTimeout(timeoutRef.current);
                            }
                            
                            timeoutRef.current = setTimeout(() => {
                              if (vid && !vid.paused) {
                                vid.pause();
                              }
                            }, 15000);
                          }
                        };

                        const handleMouseLeave = () => {
                          if (videoRef.current) {
                            const vid = videoRef.current;
                            vid.pause();
                            vid.currentTime = 0;
                            
                            if (timeoutRef.current) {
                              clearTimeout(timeoutRef.current);
                              timeoutRef.current = null;
                            }
                          }
                        };

                        return (
                          <div
                            className="group transition-all duration-300 hover:scale-105 flex-shrink-0 w-56 md:w-64 lg:w-72 cursor-pointer"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleCourseClick(video.id)}
                          >
                            <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl relative group/card">
                              {/* Video Preview (15s) */}
                              {previewSrc && (
                                <video
                                  ref={videoRef}
                                  src={previewSrc}
                                  poster={video.image}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  muted
                                  playsInline
                                  preload="auto"
                                  onLoadedData={(e) => {
                                    e.currentTarget.currentTime = 0.1;
                                    e.currentTarget.pause();
                                  }}
                                  onTimeUpdate={(e) => {
                                    if (e.currentTarget.currentTime >= 15) {
                                      e.currentTarget.pause();
                                      if (timeoutRef.current) {
                                        clearTimeout(timeoutRef.current);
                                        timeoutRef.current = null;
                                      }
                                    }
                                  }}
                                />
                              )}
                              {!video.video?.video_url_full && (
                                <img
                                  src={video.image}
                                  alt={video.title}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              
                              {/* Video Info */}
                              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge variant="secondary" className="bg-blue-600/80 text-white border-0 px-3 py-1 text-sm font-semibold">
                                    {video.category}
                                  </Badge>
                                  <div className="flex items-center space-x-1 text-sm">
                                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    <span className="font-semibold">{video.rating}</span>
                                  </div>
                                </div>
                                <h3 className="font-bold text-xl md:text-2xl mb-2 group-hover:text-white transition-colors line-clamp-2">
                                  {video.title}
                                </h3>
                                <div className="flex items-center justify-between text-sm text-gray-300">
                                  <span className="font-medium">{video.instructor}</span>
                                  <span className="font-medium">{video.duration}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return <VideoCardPreview key={video.id} />;
                    })}
                  </div>
                  
                  {/* Right Arrow */}
                  {showVideosRightArrow && !shouldCenterVideos && (
                    <button
                      onClick={() => scrollVideosCarousel('right')}
                      className="absolute right-0 top-0 bottom-0 z-20 w-12 md:w-16 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/90"
                    >
                      <ChevronRight className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default Home;
