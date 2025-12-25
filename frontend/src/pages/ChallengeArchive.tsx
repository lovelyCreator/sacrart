import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { videoApi, Video } from '@/services/videoApi';
import { toast } from 'sonner';
import { Camera, Play, ChevronLeft, ChevronRight, Filter, Trophy, X, Timer, Construction } from 'lucide-react';
import ChallengeUploadModal from '@/components/ChallengeUploadModal';

interface Challenge {
  id: number;
  title: string;
  month: string;
  thumbnail: string;
  isActive: boolean;
  isCompleted: boolean;
  endDate?: string;
  description?: string;
}

interface Submission {
  id: number;
  image: string;
  username: string;
  avatar?: string;
}

const ChallengeArchive = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'popular'>('all');

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const calculateDaysRemaining = (endDate: string): number => {
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
        
        // Fetch videos with "challenge" or "reto" tags
        const response = await videoApi.getPublic({
          status: 'published',
          per_page: 1000,
          sort_by: 'created_at',
          sort_order: 'desc',
        });

        if (response.success && response.data) {
          const videos = Array.isArray(response.data) 
            ? response.data 
            : response.data?.data || [];

          // Filter for challenges
          const challengeVideos = videos.filter((video: Video) => {
            const tags = video.tags || [];
            const tagString = tags.join(' ').toLowerCase();
            return tagString.includes('challenge') || 
                   tagString.includes('reto') ||
                   tagString.includes('desafio');
          });

          // Create challenge objects from videos
          const challengeList: Challenge[] = challengeVideos.slice(0, 12).map((video: Video, index: number) => {
            const createdDate = new Date(video.created_at || Date.now());
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const month = monthNames[createdDate.getMonth()];
            
            // Calculate end date (30 days from creation)
            const endDate = new Date(createdDate);
            endDate.setDate(endDate.getDate() + 30);
            
            return {
              id: video.id,
              title: video.title || `Reto ${index + 1}`,
              month,
              thumbnail: getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || ''),
              isActive: index === 0, // First one is active
              isCompleted: index > 0,
              endDate: endDate.toISOString(),
              description: video.description || video.short_description || '',
            };
          });

          // Set active challenge (first one)
          if (challengeList.length > 0) {
            setActiveChallenge(challengeList[0]);
          } else {
            // Add sample active challenge if no challenges found
            const sampleActiveChallenge: Challenge = {
              id: 999,
              title: 'Reto del Mes: Expresividad y Tensión Muscular',
              month: 'Enero',
              thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              isActive: true,
              isCompleted: false,
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              description: 'Este mes nos centramos en la expresividad y tensión muscular. Ana Rey te guiará en el proceso de construcción anatómica. Participa enviando tu propuesta y comparte tu proceso creativo con la comunidad.',
            };
            setActiveChallenge(sampleActiveChallenge);
            challengeList.unshift(sampleActiveChallenge);
          }

          // Add placeholder for upcoming challenges
          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const currentMonth = new Date().getMonth();
          
          // Add sample challenges if list is empty or too short
          if (challengeList.length === 0 || (challengeList.length === 1 && challengeList[0].id === 999)) {
            const sampleChallenges: Challenge[] = [
              {
                id: 998,
                title: 'Reto de Diciembre: Policromía Tradicional',
                month: 'Diciembre',
                thumbnail: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                isActive: false,
                isCompleted: true,
                endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                description: 'Exploración de técnicas tradicionales de policromía y dorado.',
              },
              {
                id: 997,
                title: 'Reto de Noviembre: Modelado de Texturas',
                month: 'Noviembre',
                thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                isActive: false,
                isCompleted: true,
                endDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
                description: 'Trabajo con diferentes texturas y superficies en el modelado.',
              },
              {
                id: 996,
                title: 'Reto de Octubre: Anatomía Expresiva',
                month: 'Octubre',
                thumbnail: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                isActive: false,
                isCompleted: true,
                endDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
                description: 'Estudio de la anatomía humana en expresiones y gestos.',
              },
            ];
            
            // Add sample challenges after the active one
            if (challengeList.length > 0 && challengeList[0].id === 999) {
              challengeList.push(...sampleChallenges);
            } else {
              challengeList.push(...sampleChallenges);
            }
          }

          // Fill remaining slots with placeholders
          while (challengeList.length < 4) {
            const monthIndex = (currentMonth + challengeList.length) % 12;
            challengeList.push({
              id: -challengeList.length,
              title: 'Próximamente...',
              month: months[monthIndex],
              thumbnail: '',
              isActive: false,
              isCompleted: false,
            });
          }

          setChallenges(challengeList);

          // Sample submissions (replace with real API call)
          const sampleSubmissions: Submission[] = [
            { id: 1, image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop', username: '@artesacro_juan' },
            { id: 2, image: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop', username: '@elena_talla' },
            { id: 3, image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop', username: '@pablo.sculpt' },
            { id: 4, image: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop', username: '@maria_restaura' },
            { id: 5, image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop', username: '@javier.art' },
            { id: 6, image: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop', username: '@lucia_doradora' },
            { id: 7, image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop', username: '@taller_sanjose' },
            { id: 8, image: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop', username: '@fran.imaginero' },
          ];
          setSubmissions(sampleSubmissions);
        }
      } catch (error: any) {
        console.error('Error loading challenges:', error);
        toast.error(error.message || t('challenges.error_load', 'Error al cargar los retos'));
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [t, selectedYear]);

  const handleChallengeClick = (challenge: Challenge) => {
    if (challenge.id > 0) {
      navigateWithLocale(`/video/${challenge.id}`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
      </main>
    );
  }

  const daysRemaining = activeChallenge?.endDate ? calculateDaysRemaining(activeChallenge.endDate) : 0;
  const activeThumbnail = activeChallenge ? getImageUrl(activeChallenge.thumbnail) : '';

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
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Reto Activo
                  </span>
                  {daysRemaining > 0 && (
                    <span className="text-gray-300 text-xs font-medium tracking-wide">
                      {daysRemaining} días restantes
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  {activeChallenge.title || 'Reto del Mes'}
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  {activeChallenge.description || 'Este mes nos centramos en la expresividad y tensión muscular. Ana Rey te guiará en el proceso de construcción anatómica.'}
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="group bg-[#A05245] hover:bg-red-700 text-white px-8 py-3.5 rounded-[4px] font-semibold text-sm md:text-base flex items-center gap-3 transition-all duration-300 shadow-xl shadow-black/30 hover:shadow-[#A05245]/20 hover:-translate-y-0.5"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Subir mi Propuesta</span>
                  </button>
                  {activeChallenge.id > 0 && (
                    <button
                      onClick={() => navigateWithLocale(`/video/${activeChallenge.id}`)}
                      className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-8 py-3.5 rounded-[4px] font-semibold text-sm md:text-base flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Play className="h-5 w-5 fill-white" />
                      <span>Ver Briefing del Reto</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Retos
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  Retos Creativos
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  Participa en nuestros retos mensuales y comparte tu proceso creativo con la comunidad. Cada mes exploramos nuevas técnicas y desafíos artísticos.
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
              Archivo Histórico de Retos
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
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => handleChallengeClick(challenge)}
                className={`group cursor-pointer ${challenge.id < 0 ? 'select-none' : ''}`}
              >
                <div
                  className={`relative aspect-[4/3] rounded-[4px] overflow-hidden mb-4 border transition-all bg-[#121212] ${
                    challenge.isActive
                      ? 'border-[#A05245]/50 shadow-[0_0_15px_rgba(160,82,69,0.2)]'
                      : challenge.id < 0
                      ? 'border-dashed border-white/10'
                      : 'border-white/5 group-hover:border-white/20'
                  }`}
                >
                  {challenge.thumbnail ? (
                    <>
                      <img
                        alt={challenge.title}
                        className={`w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105 ${
                          challenge.isActive
                            ? ''
                            : challenge.id < 0
                            ? ''
                            : 'opacity-80 group-hover:opacity-100 grayscale-[30%] group-hover:grayscale-0'
                        }`}
                        src={challenge.thumbnail}
                      />
                      <div className={`absolute inset-0 ${
                        challenge.isActive
                          ? 'bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60'
                          : 'bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80'
                      }`}></div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Construction className="h-12 w-12 text-gray-700 group-hover:text-gray-600 transition-colors" />
                    </div>
                  )}
                  
                  {challenge.isActive && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wide flex items-center gap-1 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      Activo
                    </div>
                  )}
                  
                  {challenge.isCompleted && challenge.id > 0 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-lg">
                      🏆
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-bold tracking-widest uppercase ${
                    challenge.isActive
                      ? 'text-white'
                      : challenge.id < 0
                      ? 'text-gray-500'
                      : 'text-[#A05245]'
                  }`}>
                    {challenge.month}
                  </span>
                  <h3 className={`text-lg font-bold group-hover:text-[#A05245] transition-colors ${
                    challenge.id < 0 ? 'text-gray-400 opacity-50' : 'text-white'
                  }`}>
                    {challenge.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Submissions */}
      <section className="container mx-auto px-6 md:px-12 py-16 pb-32">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white tracking-tight">Participaciones Recientes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter(filter === 'all' ? 'popular' : 'all')}
              className="bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            <button
              onClick={() => setFilter('popular')}
              className={`text-xs font-medium px-4 py-2 rounded-full transition-colors shadow-lg ${
                filter === 'popular'
                  ? 'bg-[#A05245] hover:bg-[#A05245]/90 text-white'
                  : 'bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white'
              }`}
            >
              Más Populares
            </button>
          </div>
        </div>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {submissions.map((submission) => (
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
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <button className="bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white text-xs font-bold px-8 py-3 rounded-[4px] uppercase tracking-widest transition-colors">
            Cargar más propuestas
          </button>
        </div>
      </section>

      {/* Upload Modal */}
      {showUploadModal && activeChallenge && (
        <ChallengeUploadModal
          challenge={activeChallenge}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            toast.success(t('challenges.upload_success', 'Propuesta enviada correctamente'));
            // Refresh submissions
          }}
        />
      )}
    </main>
  );
};

export default ChallengeArchive;

