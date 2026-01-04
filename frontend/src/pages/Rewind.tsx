import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { rewindApi, type Rewind } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, ChevronDown, History } from 'lucide-react';
import { toast } from 'sonner';

const Rewind = () => {
  const { t, i18n } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const [rewinds, setRewinds] = useState<Rewind[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [displayedYearsCount, setDisplayedYearsCount] = useState(2);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Helper to get translated value for rewinds
  const getTranslatedValue = (rewind: Rewind, field: 'title' | 'description' | 'short_description'): string => {
    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
    if (rewind.translations && rewind.translations[field]) {
      return rewind.translations[field][currentLocale as 'en' | 'es' | 'pt'] || 
             rewind.translations[field].en || 
             (rewind as any)[field] || '';
    }
    return (rewind as any)[`${field}_${currentLocale}`] || (rewind as any)[field] || '';
  };

  // Load rewinds from API
  useEffect(() => {
    const fetchRewinds = async () => {
      try {
        setLoading(true);
        const response = await rewindApi.getPublic({
          per_page: 1000,
        });
        
        if (response.success) {
          const rewindsData = Array.isArray(response.data?.data) 
            ? response.data.data 
            : Array.isArray(response.data) 
            ? response.data 
            : [];
          setRewinds(rewindsData);
        } else {
          toast.error(t('rewind.error_load', 'Error loading rewinds'));
          setRewinds([]);
        }
      } catch (error: any) {
        console.error('Error loading rewinds:', error);
        toast.error(error.message || t('rewind.error_load', 'Error loading rewinds'));
        setRewinds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRewinds();
  }, [t, i18n.language, locale]);

  // Extract unique years from rewinds (sorted from most recent to oldest)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    rewinds.forEach((r) => {
      if (r.year) {
        years.add(r.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [rewinds]);

  // Filter rewinds by selected year
  const filteredRewinds = useMemo(() => {
    if (!selectedYear) return rewinds;
    return rewinds.filter((r) => r.year === selectedYear);
  }, [rewinds, selectedYear]);

  // Group rewinds by year
  const rewindsByYear = useMemo(() => {
    const grouped: Record<number, Rewind[]> = {};
    filteredRewinds.forEach((r) => {
      if (r.year) {
        if (!grouped[r.year]) {
          grouped[r.year] = [];
        }
        grouped[r.year].push(r);
      }
    });
    
    // Sort years from most recent to oldest
    const sortedYears = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => b - a);
    
    const result: Record<number, Rewind[]> = {};
    sortedYears.forEach((year) => {
      result[year] = grouped[year];
    });
    
    return result;
  }, [filteredRewinds]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = [
      t('common.months.jan', 'Jan'),
      t('common.months.feb', 'Feb'),
      t('common.months.mar', 'Mar'),
      t('common.months.apr', 'Apr'),
      t('common.months.may', 'May'),
      t('common.months.jun', 'Jun'),
      t('common.months.jul', 'Jul'),
      t('common.months.aug', 'Aug'),
      t('common.months.sep', 'Sep'),
      t('common.months.oct', 'Oct'),
      t('common.months.nov', 'Nov'),
      t('common.months.dec', 'Dec'),
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getCategoryColor = (tagName: string | undefined) => {
    if (!tagName) return 'text-gray-400';
    const name = tagName.toLowerCase();
    if (name.includes('restauración') || name.includes('restauracion')) return 'text-[#A05245]';
    if (name.includes('dorado')) return 'text-[#C5A065]';
    if (name.includes('talla')) return 'text-green-500';
    if (name.includes('policromía') || name.includes('policromia')) return 'text-red-500';
    if (name.includes('estudio')) return 'text-blue-400';
    if (name.includes('escultura')) return 'text-orange-400';
    if (name.includes('investigación') || name.includes('investigacion')) return 'text-purple-400';
    if (name.includes('exhibición') || name.includes('exhibicion')) return 'text-gray-300';
    return 'text-gray-400';
  };

  const getRewindType = (videoCount: number) => {
    if (videoCount === 1) return t('rewind.masterclass', 'Masterclass');
    if (videoCount <= 3) return t('rewind.series_short', 'Series of {count} Ep.', { count: videoCount });
    if (videoCount <= 6) return t('rewind.series_medium', 'Series of {count} Ep.', { count: videoCount });
    return t('rewind.series_long', 'Series of {count} Ep.', { count: videoCount });
  };

  const handleRewindClick = (rewind: Rewind) => {
    navigateWithLocale(`/rewind/${rewind.id}`);
  };

  const toggleYearExpansion = (year: number) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  // Initialize: all years start expanded (Set tracks collapsed years, so start empty)
  useEffect(() => {
    // No initialization needed - all years start expanded by default
    // The Set will track collapsed years instead of expanded ones
  }, [availableYears]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
        </div>
      </main>
    );
  }

  const displayYears = selectedYear 
    ? [selectedYear] 
    : availableYears.slice(0, displayedYearsCount);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden flex flex-col">
      {/* Header Section */}
      <section className="pt-16 pb-12 px-6 md:px-12 max-w-[1800px] mx-auto border-b border-white/5">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight flex items-center justify-center gap-3">
              <span className="material-icons text-[#A05245] text-3xl md:text-5xl opacity-80">history</span>
              REWIND: <span className="text-gray-500 font-serif italic">{t('rewind.archive', 'The Archive')}</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-lg font-light max-w-2xl mx-auto leading-relaxed">
              {t('rewind.subtitle', 'Explore the workshop history year by year. The process unfiltered.')}
            </p>
          </div>

          {/* Year Filter Buttons */}
          <div className="w-full max-w-3xl mt-8 pt-6 border-t border-white/5">
            <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 font-mono">
              <button
                onClick={() => setSelectedYear(null)}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  !selectedYear
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] transform scale-105'
                    : 'border border-white/10 text-gray-400 hover:border-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('rewind.all', 'All')}
              </button>
              {availableYears.length > 0 && (
                <>
                  <div className="h-px w-4 md:w-8 bg-white/20 hidden sm:block"></div>
                  {availableYears.map((year, index) => (
                    <div key={year} className="flex items-center gap-3 md:gap-6">
                      <button
                        onClick={() => setSelectedYear(year === selectedYear ? null : year)}
                        className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                          selectedYear === year
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] transform scale-105'
                            : 'border border-white/10 text-gray-400 hover:border-white/40 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {year}
                      </button>
                      {index < availableYears.length - 1 && (
                        <div className="h-px w-4 md:w-8 bg-white/10 hidden sm:block"></div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Rewinds Grid by Year */}
      <div className="px-24 md:px-48 pt-12 pb-4 max-w-[1800px] mx-auto w-full">
        {displayYears.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {t('rewind.no_series', 'No series available.')}
            </p>
          </div>
        ) : (
          displayYears.map((year) => {
            const yearRewinds = rewindsByYear[year] || [];
            if (yearRewinds.length === 0) return null;

            const isExpanded = !expandedYears.has(year);

            return (
              <section key={year} className="mb-12 w-full">
                <div className="flex items-center gap-3 mb-6 px-2 ">
                  <button
                    onClick={() => toggleYearExpansion(year)}
                    className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity group"
                  >
                    <ChevronDown 
                      className={`h-5 w-5 text-[#A05245] transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
                    />
                    <h2 className="text-xl md:text-2xl font-display font-semibold text-white tracking-widest">
                      {year}
                    </h2>
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="scrolling-wrapper flex overflow-x-auto gap-4 pb-6 snap-x px-2 scrollbar-hide items-start justify-start -mx-2 md:mx-0" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
                    {yearRewinds.map((r) => {
                      const thumbnailUrl = getImageUrl(r.cover_image || r.thumbnail || r.image_url || '');
                      const hasThumbnail = thumbnailUrl && thumbnailUrl !== '';

                      return (
                        <div
                          key={r.id}
                          onClick={() => handleRewindClick(r)}
                          className="flex-none min-w-[200px] w-[200px] md:min-w-[250px] md:w-[250px] xl:min-w-[280px] xl:w-[280px] 2xl:min-w-[320px] 2xl:w-[320px] aspect-[9/16] relative rounded-lg overflow-hidden cursor-pointer group/card bg-gray-900 border border-white/5 hover:border-[#A05245]/50 transition-all duration-300 hover:scale-[1.02] shadow-lg flex-shrink-0 snap-start"
                        >
                          {hasThumbnail ? (
                            <img
                              src={thumbnailUrl}
                              alt={getTranslatedValue(r, 'title')}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-black transition-transform duration-700 group-hover/card:scale-105"></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                          <div className="absolute inset-0 bg-black/20 group-hover/card:bg-transparent transition-colors duration-500"></div>
                          
                          {r.video_count > 0 && (
                            <div className="absolute top-3 right-3 z-20">
                              <span className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 text-[9px] font-bold text-white uppercase tracking-wider">
                                {getRewindType(r.video_count)}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px] z-20">
                            <Play className="h-16 w-16 text-white drop-shadow-lg fill-white" />
                          </div>

                          <div className="absolute bottom-0 left-0 p-4 w-full z-10">
                            {r.tags && r.tags.length > 0 && (
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded mb-2 border ${
                                getCategoryColor(r.tags[0]).includes('A05245') ? 'bg-[#A05245]/30 text-[#A05245] border-[#A05245]/20' :
                                getCategoryColor(r.tags[0]).includes('C5A065') ? 'bg-[#C5A065]/30 text-[#C5A065] border-[#C5A065]/20' :
                                'bg-gray-600/20 text-gray-400 border-gray-600/20'
                              }`}>
                                {r.tags[0]}
                              </span>
                            )}
                            <h3 className="text-white font-bold text-lg leading-tight group-hover/card:text-[#A05245] transition-colors">
                              {getTranslatedValue(r, 'title')}
                            </h3>
                            <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 delay-75">
                              {getTranslatedValue(r, 'short_description') || getTranslatedValue(r, 'description')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* Load More Years Button (if needed) */}
      {availableYears.length > displayedYearsCount && !selectedYear && (
        <div className="mt-24 flex justify-center pb-20">
          <button 
            onClick={() => setDisplayedYearsCount(prev => Math.min(prev + 5, availableYears.length))}
            className="px-8 py-3 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-[#A05245] transition-all hover:bg-white/5 flex items-center gap-2"
          >
            {t('rewind.load_older', 'Load Older Years')} <History className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>
  );
};

export default Rewind;
