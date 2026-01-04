import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { reelApi, Reel } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, Key, User, Church, Smile, Lightbulb, ArrowLeft, ChevronDown, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

// Definir categorías/tags iniciales (matching code.html order)
const REEL_CATEGORIES = [
  { tag: 'tips', label: 'Tips Express', icon: '⚡', color: 'yellow-500' },
  { tag: 'curiosidades', label: 'Curiosidades', icon: '🤓', color: 'blue-400' },
  { tag: 'procesos', label: 'Procesos', icon: '✨', color: 'yellow-200' },
  { tag: 'preguntas', label: 'Q&A', icon: '🗣️', color: 'white' },
  { tag: 'bendiciones', label: 'Bendiciones', icon: '⛪', color: 'white' },
];

const Reels = () => {
  const { t, i18n } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [collectionView, setCollectionView] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Fetch reels from API
  useEffect(() => {
    const fetchReels = async () => {
      try {
        setLoading(true);
        const currentLocale = i18n.language || locale || 'en';
        const response = await reelApi.getPublic({
          per_page: 1000,
          sort_by: 'sort_order',
          sort_order: 'asc',
        });
        
        if (response.success) {
          const reelsData = Array.isArray(response.data?.data) 
            ? response.data.data 
            : Array.isArray(response.data) 
            ? response.data 
            : [];
          setReels(reelsData);
        } else {
          toast.error(t('reels.error_load', 'Error loading reels'));
          setReels([]);
        }
      } catch (error: any) {
        console.error('Error fetching reels:', error);
        toast.error(error.message || t('reels.error_load', 'Error loading reels'));
        setReels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, [t, i18n.language, locale]);

  // Helper to get translated value for reels
  const getTranslatedValue = (reel: Reel, field: 'title' | 'description' | 'short_description'): string => {
    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
    if (reel.translations && reel.translations[field]) {
      return reel.translations[field][currentLocale as 'en' | 'es' | 'pt'] || 
             reel.translations[field].en || 
             (reel as any)[field] || '';
    }
    return (reel as any)[`${field}_${currentLocale}`] || (reel as any)[field] || '';
  };

  // Helper to get translated category name
  const getCategoryName = (category: any): string => {
    if (!category) return '';
    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
    
    // First try to get from translations object
    if (category.translations && category.translations.name) {
      return category.translations.name[currentLocale as 'en' | 'es' | 'pt'] || 
             category.translations.name.en || 
             category.name || '';
    }
    
    // Try multilingual columns directly
    const columnName = `name_${currentLocale}`;
    if (category[columnName]) {
      return category[columnName];
    }
    if (category.name_en) {
      return category.name_en;
    }
    
    // Fallback to the main name field
    return category.name || '';
  };

  // Helper to get translated category description
  const getCategoryDescription = (category: any): string => {
    if (!category) return '';
    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
    
    // First try to get from translations object
    if (category.translations && category.translations.description) {
      return category.translations.description[currentLocale as 'en' | 'es' | 'pt'] || 
             category.translations.description.en || 
             category.description || '';
    }
    
    // Try multilingual columns directly
    const columnName = `description_${currentLocale}`;
    if (category[columnName]) {
      return category[columnName];
    }
    if (category.description_en) {
      return category.description_en;
    }
    
    // Fallback to the main description field
    return category.description || '';
  };

  // Filtrar reels según búsqueda o filtro activo
  const filteredReels = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return reels.filter((reel) => {
        const title = getTranslatedValue(reel, 'title').toLowerCase();
        const description = getTranslatedValue(reel, 'description').toLowerCase();
        const shortDesc = getTranslatedValue(reel, 'short_description').toLowerCase();
        const categoryName = getCategoryName(reel.category).toLowerCase();
        const tagsMatch = reel.tags?.some(tag => 
          tag.toLowerCase().includes(query)
        );
        return title.includes(query) || description.includes(query) || shortDesc.includes(query) || categoryName.includes(query) || tagsMatch;
      });
    }
    
    if (activeFilter) {
      return reels.filter((reel) => {
        // Filter by category slug or tag
        const categorySlug = reel.category?.slug?.toLowerCase() || '';
        const categoryTag = (reel as any).category_tag?.toLowerCase() || '';
        const tagsMatch = reel.tags?.some(tag => 
          tag.toLowerCase() === activeFilter.toLowerCase() || 
          tag.toLowerCase().includes(activeFilter.toLowerCase())
        );
        return categorySlug === activeFilter.toLowerCase() || 
               categoryTag === activeFilter.toLowerCase() || 
               tagsMatch;
      });
    }
    
    return reels;
  }, [reels, searchQuery, activeFilter, i18n.language, locale]);

  // Agrupar reels por categoría para mostrar en filas temáticas
  const reelsByCategory = useMemo(() => {
    if (searchQuery.trim() || activeFilter) {
      return {}; // No agrupar cuando hay búsqueda o filtro activo
    }

    const grouped: Record<string, Reel[]> = {};
    
    // Group by category
    reels.forEach((reel) => {
      const categorySlug = reel.category?.slug || (reel as any).category_tag || 'other';
      if (!grouped[categorySlug]) {
        grouped[categorySlug] = [];
      }
      grouped[categorySlug].push(reel);
    });

    return grouped;
  }, [reels, searchQuery, activeFilter]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReelClick = (reel: Reel) => {
    navigateWithLocale(`/reel/${reel.id}`);
  };

  const handleFilterClick = (tag: string) => {
    setCollectionView(true);
    setActiveFilter(tag);
    setSearchQuery('');
  };

  const handleBackToReels = () => {
    setCollectionView(false);
    setActiveFilter(null);
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim()) {
      setActiveFilter(null);
    }
  };

  // Collection Card Component (matching code1.html)
  const CollectionCard = ({ reel }: { reel: Reel }) => {
    const title = getTranslatedValue(reel, 'title');
    const description = getTranslatedValue(reel, 'description');
    const shortDesc = getTranslatedValue(reel, 'short_description');
    const thumbnailUrl = getImageUrl(reel.thumbnail_url || reel.thumbnail || reel.bunny_thumbnail_url || '');
    
    // Get badge text from category or tags
    const getBadge = () => {
      const categoryName = getCategoryName(reel.category).toLowerCase();
      if (categoryName.includes('tip') || categoryName.includes('truco')) {
        return { text: getCategoryName(reel.category) || t('reels.tip', 'Tip'), color: 'yellow' };
      }
      return reel.category ? { text: getCategoryName(reel.category), color: 'blue' } : null;
    };

    const badge = getBadge();

    // Get background - use thumbnail if available, otherwise use gradient
    const getBackground = () => {
      if (thumbnailUrl) {
        return '';
      }
      // Default gradient based on category color
      const categoryColor = reel.category?.color;
      if (categoryColor) {
        return `bg-[${categoryColor}]`;
      }
      return 'bg-gradient-to-br from-slate-700 to-slate-900';
    };

    return (
      <div
        onClick={() => handleReelClick(reel)}
        className="relative flex-none min-w-[150px] w-[150px] sm:min-w-[200px] sm:w-[200px] xl:min-w-[250px] xl:w-[250px] 2xl:min-w-[300px] 2xl:w-[300px] aspect-[9/16] rounded-lg overflow-hidden cursor-pointer group bg-gray-900 border border-white/5 hover:border-[#A05245]/50 transition-all duration-300 shadow-lg flex-shrink-0 snap-start"
      >
        {/* Background */}
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 ${getBackground()} transition-transform duration-700 group-hover:scale-105`}></div>
        )}
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Duration */}
        {reel.duration && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide border border-white/10 shadow-sm z-20">
            {formatDuration(reel.duration)}
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 p-5 w-full z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          {badge && (
            <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded mb-2 border ${
              badge.color === 'yellow' ? 'bg-yellow-600/30 text-yellow-500 border-yellow-600/20' :
              badge.color === 'red' ? 'bg-red-600/30 text-red-500 border-red-600/20' :
              badge.color === 'green' ? 'bg-green-600/30 text-green-500 border-green-600/20' :
              badge.color === 'blue' ? 'bg-blue-600/30 text-blue-400 border-blue-600/20' :
              'bg-gray-600/30 text-gray-400 border-gray-600/20'
            }`}>
              {badge.text}
            </span>
          )}
          <h3 className="text-white font-bold text-lg leading-tight group-hover:text-[#A05245] transition-colors">
            {title}
          </h3>
          <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
            {description || shortDesc}
          </p>
        </div>

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/10 backdrop-blur-[1px]">
          <PlayCircle className="h-20 w-20 text-white drop-shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300 fill-white" />
        </div>
      </div>
    );
  };

  const ReelCard = ({ reel }: { reel: Reel }) => {
    const title = getTranslatedValue(reel, 'title');
    const description = getTranslatedValue(reel, 'description');
    const shortDesc = getTranslatedValue(reel, 'short_description');
    const thumbnailUrl = getImageUrl(reel.thumbnail_url || reel.thumbnail || reel.bunny_thumbnail_url || '');
    
    // Get badge text from category
    const getBadge = () => {
      if (reel.category) {
        return getCategoryName(reel.category);
      }
      return null;
    };

    const badge = getBadge();

    // Get background - use thumbnail if available, otherwise use gradient
    const getBackground = () => {
      if (thumbnailUrl) {
        return '';
      }
      // Default gradient based on category color
      const categoryColor = reel.category?.color;
      if (categoryColor) {
        return `bg-[${categoryColor}]`;
      }
      return 'bg-gradient-to-br from-slate-700 to-slate-900';
    };

    return (
      <div
        onClick={() => handleReelClick(reel)}
        className="flex-none min-w-[180px] w-[180px] md:min-w-[220px] md:w-[220px] aspect-[9/16] relative rounded-lg overflow-hidden cursor-pointer group/card bg-gray-900 border border-white/5 hover:border-[#A05245]/50 transition-all duration-300 hover:scale-[1.02] shadow-lg flex-shrink-0 snap-start"
      >
        {/* Background */}
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 ${getBackground()}`}></div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 p-4 w-full z-10">
          {badge && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded mb-2 border bg-gray-600/20 text-gray-400 border-gray-600/20">
              {badge}
            </span>
          )}
          <h4 className="text-white font-bold leading-snug text-lg group-hover/card:text-[#A05245] transition-colors">
            {title}
          </h4>
          <p className="text-gray-400 text-xs mt-1">
            {shortDesc || description}
          </p>
        </div>

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px] z-20">
          <Play className="h-12 w-12 text-white drop-shadow-lg fill-white" />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
        </div>
      </main>
    );
  }

  const showGrid = searchQuery.trim() || (activeFilter && !collectionView);
  const displayReels = showGrid ? filteredReels : [];
  
  // Get current category info
  const currentCategory = activeFilter ? reels.find(r => r.category?.slug === activeFilter)?.category : null;
  const categoryReels = activeFilter ? filteredReels : [];

  // Collection view (matching code1.html)
  if (collectionView && activeFilter) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden flex flex-col">
        {/* Collection Header */}
        <section className="pt-8 pb-8 px-6 md:px-12 max-w-[1800px] mx-auto border-b border-white/5">
          <button
            onClick={handleBackToReels}
            className="inline-flex items-center text-gray-400 hover:text-[#A05245] transition-colors text-xs font-semibold tracking-wide mb-6 uppercase"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('reels.back_to_reels', 'Back to Reels')}
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white flex items-center gap-3">
                {currentCategory?.icon && (
                  <span className="text-2xl">{currentCategory.icon}</span>
                )}
                {getCategoryName(currentCategory) || t('reels.default_category', 'Reels')}
              </h1>
              {currentCategory?.description && (
                <p className="text-gray-400 text-sm md:text-base font-light max-w-2xl leading-relaxed">
                  {getCategoryDescription(currentCategory)}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold hidden md:inline-block">{t('reels.view', 'View')}:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-[#141414] border border-white/10 rounded px-4 py-2 pr-10 text-sm text-gray-300 focus:outline-none focus:border-[#A05245] hover:bg-[#1a1a1a] cursor-pointer min-w-[180px]"
                >
                  <option value="recent">{t('reels.sort_recent', 'Most Recent')}</option>
                  <option value="popular">{t('reels.sort_popular', 'Most Popular')}</option>
                  <option value="oldest">{t('reels.sort_oldest', 'Oldest')}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Collection Grid */}
        <section className="px-6 md:px-12 py-10 max-w-[1800px] mx-auto min-w-[60%]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-items-start">
            {categoryReels.map((reel) => (
              <CollectionCard key={reel.id} reel={reel} />
            ))}
          </div>
          
          <div className="mt-16 flex justify-center">
            <button className="px-8 py-3 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-[#A05245] transition-all hover:bg-white/5">
              {t('reels.load_more', 'Load More')}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden flex flex-col">
      {/* Header Section */}
      <section className="relative pt-16 pb-12 px-4 md:px-12 flex flex-col items-center text-center z-10 border-b border-white/5 bg-[#0A0A0A]">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            className="w-full h-full object-cover opacity-10 filter blur-md mix-blend-luminosity" 
            src="https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/90 to-[#0A0A0A]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#A05245]/10 via-transparent to-transparent opacity-50"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 mt-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-wide drop-shadow-lg leading-tight">
            {t('reels.title', 'REELS')} <span className="text-[#A05245]">&amp;</span> {t('reels.pinceladas', 'PINCELADAS')}
          </h1>
          <p className="text-gray-400 text-base md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
            {t('reels.subtitle', 'Your visual encyclopedia of sacred art in vertical format.')}<br className="hidden sm:inline" />{t('reels.subtitle2', 'Tricks, stories and workshop moments.')}
          </p>
          
          {/* Search Bar */}
          <div className="relative w-full max-w-2xl mx-auto mt-10 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <span className="text-xl">🔍</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t('reels.search_placeholder', 'Search for a technique, material or curiosity...')}
              className="w-full py-4 pl-14 pr-6 bg-[#141414] border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A05245]/50 focus:border-[#A05245]/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all text-base md:text-lg"
            />
          </div>

        </div>
      </section>

      {/* Content Area */}
      <div className="space-y-12 px-4 md:px-12 z-10 relative mt-8 w-full max-w-[1800px] mx-auto pb-20">
        {showGrid ? (
          /* Grid View - When searching or filtering */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-items-start">
            {displayReels.length > 0 ? (
              displayReels.map((reel) => (
                <ReelCard key={reel.id} reel={reel} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 text-lg">
                  {t('reels.no_results', 'No reels found with these criteria.')}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Thematic Rows - Default view */
          <>
            {Object.entries(reelsByCategory).map(([categorySlug, categoryReels]) => {
              if (categoryReels.length === 0) return null;
              const category = categoryReels[0]?.category;

              return (
                <div key={categorySlug} className="group relative">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl md:text-2xl font-display font-semibold text-white flex items-center gap-3 flex-shrink-0">
                      {category?.icon && (
                        <span className="text-2xl">{category.icon}</span>
                      )}
                      {getCategoryName(category) || categorySlug}
                    </h3>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        handleFilterClick(categorySlug);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex-shrink-0 ml-4 cursor-pointer"
                    >
                      {t('reels.see_all', 'See all')}
                    </a>
                  </div>
                  
                  <div className="scrolling-wrapper flex overflow-x-auto gap-4 pb-6 snap-x px-2 scrollbar-hide items-start justify-start -mx-2 md:mx-0" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
                    {categoryReels.map((reel) => (
                      <ReelCard key={reel.id} reel={reel} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
};

export default Reels;

