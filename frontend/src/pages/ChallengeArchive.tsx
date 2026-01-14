import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/contexts/AuthContext';
import challengeApi, { Challenge } from '@/services/challengeApi';
import ChallengeUploadModal from '@/components/ChallengeUploadModal';
import { toast } from 'sonner';
import { Camera, ChevronLeft, ChevronRight, Filter, Construction, CheckCircle2, Image as ImageIcon, Timer, PlayCircle, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Submission {
  id: number;
  image: string;
  username: string;
  avatar?: string;
}

const ChallengeArchive = () => {
  const { t, i18n } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [filter, setFilter] = useState<'all' | 'popular'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const calculateDaysRemaining = (endDate: string | null | undefined): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        
        // Fetch challenges from API (show all active challenges for archive)
        const response = await challengeApi.getAll(true);
        
        if (response.success && response.data) {
          const challengeList = Array.isArray(response.data) ? response.data : [];
          
          // Set active challenge (first active/pending challenge, or first challenge)
          const firstActive = challengeList.find((c: Challenge) => !c.is_completed) || challengeList[0];
          if (firstActive) {
            setActiveChallenge(firstActive);
          }
          
          setChallenges(challengeList);
        } else {
          setChallenges([]);
        }

        // Fetch recent submissions
        const submissionsResponse: any = await challengeApi.getRecentSubmissions(20);
        if (submissionsResponse && submissionsResponse.success && submissionsResponse.data) {
          const submissionsList = submissionsResponse.data.map((sub: any) => ({
            id: sub.id,
            image: sub.image,
            username: sub.username,
            avatar: sub.avatar || undefined,
            completed_at: sub.completed_at || null,
          }));
          setAllSubmissions(submissionsList);
          // Apply initial filter
          if (filter === 'popular') {
            // For now, "popular" means most recent (we can add likes/views later)
            setSubmissions(submissionsList.slice(0, 12));
          } else {
            setSubmissions(submissionsList);
          }
        } else {
          setSubmissions([]);
          setAllSubmissions([]);
        }
      } catch (error: any) {
        console.error('Error loading challenges:', error);
        toast.error(error.message || t('challenges.error_load'));
        setChallenges([]);
        setSubmissions([]);
        setAllSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [t, selectedYear, user]);

  // Apply filter when filter state changes
  useEffect(() => {
    if (filter === 'popular') {
      // For now, "popular" means most recent (first 12)
      // Later we can add likes/views to determine popularity
      setSubmissions(allSubmissions.slice(0, 12));
    } else {
      setSubmissions(allSubmissions);
    }
  }, [filter, allSubmissions]);

  const handleChallengeClick = (challenge: Challenge) => {
    if (challenge.is_completed && challenge.generated_image_url) {
      // Show generated image for completed challenges
      setSelectedImage(challenge.generated_image_url);
      setShowImageDialog(true);
    } else if (!challenge.is_completed) {
      // Navigate to AI Drawing Tool with challenge context
      navigateWithLocale(`/tool?challenge=${challenge.id}&title=${encodeURIComponent(challenge.title)}`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
      </main>
    );
  }

  const daysRemaining = activeChallenge?.end_date ? calculateDaysRemaining(activeChallenge.end_date) : 0;
  const activeThumbnail = activeChallenge ? getImageUrl(activeChallenge.thumbnail_url || activeChallenge.image_url || '') : '';
  const isActiveCompleted = activeChallenge?.is_completed || false;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
      {/* Hero Section */}
      <section className="relative w-full h-[65vh] md:h-[75vh] flex items-end">
        <div className="absolute inset-0 w-full h-full">
          {activeThumbnail ? (
            <img
              alt="Challenge Briefing"
              className="w-full h-full object-cover object-center opacity-60"
              src={activeThumbnail}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent"></div>
        </div>
        <div className="container mx-auto px-6 md:px-12 relative z-10 pb-16 md:pb-24">
          <div className="max-w-3xl">
            {activeChallenge ? (
              <>
                <div className="flex items-center gap-3 mb-6 animate-pulse">
                  {isActiveCompleted ? (
                    <span className="inline-flex items-center gap-1.5 bg-green-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-green-900/30">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('challenges.completed', 'Reto Completado')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 bg-red-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/30">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      {t('challenges.live_presentation', 'En Directo: Presentación del Reto')}
                    </span>
                  )}
                  {!isActiveCompleted && daysRemaining > 0 && (
                    <span className="text-gray-300 text-xs font-medium tracking-wide">
                      {t('challenges.days_remaining', `Tienes ${daysRemaining} días para participar`, { count: daysRemaining })}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-none tracking-tight drop-shadow-2xl">
                  {activeChallenge.title || t('challenges.challenge_of_month')}
                </h1>
                <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 mb-10">
                  {!isActiveCompleted && daysRemaining > 0 && (
                    <div className="flex items-center gap-2 text-primary font-bold tracking-widest uppercase text-sm">
                      <Timer className="h-4 w-4" />
                      <span>{t('challenges.days_remaining', { count: daysRemaining })}</span>
                    </div>
                  )}
                  {!isActiveCompleted && daysRemaining > 0 && (
                    <div className="h-px w-12 bg-white/20 hidden md:block"></div>
                  )}
                  <p className="text-gray-300 text-sm md:text-base max-w-lg leading-relaxed drop-shadow-md">
                    {activeChallenge.description || t('challenges.challenges_description')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {isActiveCompleted ? (
                    <>
                      <button
                        onClick={() => {
                          if (activeChallenge.generated_image_url) {
                            setSelectedImage(activeChallenge.generated_image_url);
                            setShowImageDialog(true);
                          }
                        }}
                        className="group bg-green-600/90 hover:bg-green-700 text-white px-8 py-3.5 rounded-[4px] font-semibold text-sm md:text-base flex items-center gap-3 transition-all duration-300 shadow-xl shadow-black/30 hover:shadow-green-600/20 hover:-translate-y-0.5"
                      >
                        <ImageIcon className="h-5 w-5" />
                        <span>{t('challenges.see_my_drawing', 'Ver mi Dibujo')}</span>
                      </button>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="group bg-white hover:bg-gray-200 text-black px-8 py-4 rounded-[4px] font-bold text-sm md:text-base flex items-center gap-3 transition-all duration-300 shadow-xl shadow-black/30 hover:-translate-y-0.5"
                      >
                        <Upload className="h-5 w-5" />
                        <span>{t('challenges.submit_proposal', 'Subir mi Propuesta')}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="group bg-[#A05245] hover:bg-red-700 text-white px-8 py-3.5 rounded-[4px] font-semibold text-sm md:text-base flex items-center gap-3 transition-all duration-300 shadow-xl shadow-black/30 hover:shadow-[#A05245]/20 hover:-translate-y-0.5"
                      >
                        <Camera className="h-5 w-5" />
                        <span>{t('challenges.start_challenge', 'Comenzar Reto')}</span>
                      </button>
                      <button
                        onClick={() => navigateWithLocale(`/tool?challenge=${activeChallenge.id}&title=${encodeURIComponent(activeChallenge.title)}`)}
                        className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-[4px] font-bold text-sm md:text-base flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5"
                      >
                        <PlayCircle className="h-5 w-5" />
                        <span>{t('challenges.view_briefing', 'Ver Briefing del Reto')}</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {t('challenges.challenge')}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  {t('challenges.challenges_title')}
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  {t('challenges.challenges_description')}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Historical Archive */}
      <section className="border-t border-white/5 bg-[#0A0A0A] py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {t('challenges.historical_archive')}
            </h2>
            <div className="flex items-center gap-6 bg-[#18181b] px-6 py-2 rounded-full border border-white/5">
              <button
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex < availableYears.length - 1) {
                    setSelectedYear(availableYears[currentIndex + 1]);
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-[#A05245] font-bold text-lg tracking-widest select-none">{selectedYear}</span>
              <button
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex > 0) {
                    setSelectedYear(availableYears[currentIndex - 1]);
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {challenges.map((challenge) => {
              const isCompleted = challenge.is_completed || false;
              const thumbnail = getImageUrl(challenge.thumbnail_url || challenge.image_url || '');
              
              return (
                <div
                  key={challenge.id}
                  onClick={() => handleChallengeClick(challenge)}
                  className={`group cursor-pointer ${
                    isCompleted ? 'opacity-90' : ''
                  }`}
                >
                  <div
                    className={`relative aspect-[4/3] rounded-[4px] overflow-hidden mb-4 border transition-all bg-[#121212] ${
                      isCompleted
                        ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                        : challenge.id === activeChallenge?.id
                        ? 'border-[#A05245]/50 shadow-[0_0_15px_rgba(160,82,69,0.2)]'
                        : 'border-white/5 group-hover:border-white/20'
                    }`}
                  >
                    {thumbnail ? (
                      <>
                        <img
                          alt={challenge.title}
                          className={`w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105 ${
                            isCompleted
                              ? 'opacity-75'
                              : challenge.id === activeChallenge?.id
                              ? ''
                              : 'opacity-80 group-hover:opacity-100 grayscale-[30%] group-hover:grayscale-0'
                          }`}
                          src={thumbnail}
                        />
                        <div className={`absolute inset-0 ${
                          isCompleted
                            ? 'bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70'
                            : challenge.id === activeChallenge?.id
                            ? 'bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60'
                            : 'bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80'
                        }`}></div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Construction className="h-12 w-12 text-gray-700 group-hover:text-gray-600 transition-colors" />
                      </div>
                    )}
                    
                    {challenge.id === activeChallenge?.id && !isCompleted && (
                      <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wide flex items-center gap-1 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        {t('challenges.active')}
                      </div>
                    )}
                    
                    {isCompleted && (
                      <div className="absolute top-3 right-3 bg-green-600/90 backdrop-blur-sm border border-green-400/30 rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${
                      isCompleted
                        ? 'text-yellow-500'
                        : challenge.id === activeChallenge?.id
                        ? 'text-white'
                        : 'text-[#A05245]'
                    }`}>
                      {challenge.start_date 
                        ? new Date(challenge.start_date).toLocaleDateString(i18n?.language || locale || 'es-ES', { month: 'long', year: 'numeric' })
                        : t('challenges.challenge')
                      }
                    </span>
                    <h3 className={`text-lg font-bold group-hover:text-[#A05245] transition-colors ${
                      isCompleted ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {challenge.title}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Submissions */}
      <section className="container mx-auto px-6 md:px-12 py-16 pb-32">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white tracking-tight">{t('challenges.recent_submissions')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter(filter === 'all' ? 'popular' : 'all')}
              className="bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t('challenges.filter')}
            </button>
            <button
              onClick={() => setFilter(filter === 'popular' ? 'all' : 'popular')}
              className={`text-xs font-medium px-4 py-2 rounded-full transition-colors shadow-lg ${
                filter === 'popular'
                  ? 'bg-[#A05245] hover:bg-[#A05245]/90 text-white'
                  : 'bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white'
              }`}
            >
              {t('challenges.most_popular')}
            </button>
          </div>
        </div>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {submissions.length > 0 ? submissions.map((submission) => (
            <div key={submission.id} className="break-inside-avoid relative group cursor-pointer">
              <img
                alt={`Submission by ${submission.username}`}
                className="w-full rounded-[4px] border border-white/10 hover:border-white/30 transition-colors"
                src={submission.image}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 rounded-[4px]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden border border-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-[#A05245] to-[#8a4539] flex items-center justify-center text-white font-bold text-xs">
                      {submission.username.charAt(1).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white">{submission.username}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 text-lg mb-2">{t('challenges.no_submissions')}</p>
              <p className="text-gray-500 text-sm">{t('challenges.no_submissions_description')}</p>
            </div>
          )}
        </div>
        {submissions.length > 0 && (
          <div className="mt-12 flex justify-center">
            <button className="bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white text-xs font-bold px-8 py-3 rounded-[4px] uppercase tracking-widest transition-colors">
              {t('challenges.load_more')}
            </button>
          </div>
        )}
      </section>

      {/* Image Viewer Dialog for Completed Challenges */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('challenges.my_drawing', 'Mi Dibujo')}</DialogTitle>
            <DialogDescription>
              {t('challenges.completed_challenge_image', 'Tu dibujo completado para este reto')}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="mt-4">
              <img
                src={getImageUrl(selectedImage)}
                alt={t('challenges.my_drawing', 'Mi Dibujo')}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Modal - Show when user clicks "Subir mi Propuesta" */}
      {showUploadModal && activeChallenge && (
        <ChallengeUploadModal
          challenge={{
            id: activeChallenge.id,
            title: activeChallenge.title,
            month: activeChallenge.start_date 
              ? new Date(activeChallenge.start_date).toLocaleDateString('es-ES', { month: 'long' })
              : 'Reto',
            thumbnail: activeChallenge.thumbnail_url || activeChallenge.image_url || '',
            isActive: !activeChallenge.is_completed || false,
            isCompleted: activeChallenge.is_completed || false,
            endDate: activeChallenge.end_date || undefined,
            description: activeChallenge.description || undefined,
          }}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            toast.success(t('challenges.upload_success'));
          }}
        />
      )}
    </main>
  );
};

export default ChallengeArchive;

