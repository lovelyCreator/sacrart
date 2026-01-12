import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/contexts/AuthContext';
import challengeApi, { Challenge } from '@/services/challengeApi';
import { toast } from 'sonner';
import { Trophy, CheckCircle2, Play, Image as ImageIcon, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Challenges = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await challengeApi.getAll();
      if (response.success && response.data) {
        setChallenges(response.data);
      } else {
        setChallenges([]);
      }
    } catch (error: any) {
      console.error('Error fetching challenges:', error);
      toast.error(t('challenges.error_load', 'Error al cargar los retos'));
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const handleChallengeClick = (challenge: Challenge) => {
    if (challenge.is_completed && challenge.generated_image_url) {
      // Show generated image for completed challenges
      setSelectedImage(challenge.generated_image_url);
      setShowImageDialog(true);
    } else if (!challenge.is_completed) {
      // Navigate to generation tool with challenge context
      navigateWithLocale(`/tool?challenge=${challenge.id}&title=${encodeURIComponent(challenge.title)}`);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 w-full pt-32 bg-[#0f0f0f] min-h-screen font-display text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full pt-32 bg-[#0f0f0f] min-h-screen font-display text-white">
      <div className="container mx-auto px-6 md:px-12 mb-16">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {t('challenges.title', 'Creative Challenges')}
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('challenges.description', 'Participate in our creative challenges and share your artistic process with the community.')}
          </p>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">
              {t('challenges.no_challenges', 'No challenges available at the moment.')}
            </p>
            <Button onClick={() => navigateWithLocale('/')} variant="outline">
              {t('common.back_to_home', 'Back to Home')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => handleChallengeClick(challenge)}
                className={`group cursor-pointer relative rounded-lg overflow-hidden border transition-all ${
                  challenge.is_completed
                    ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-transparent'
                    : 'border-white/10 hover:border-primary/50 bg-[#151515]'
                } ${challenge.is_completed ? 'opacity-90' : ''}`}
              >
                {/* Challenge Image */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  {challenge.thumbnail_url || challenge.image_url ? (
                    <img
                      src={getImageUrl(challenge.thumbnail_url || challenge.image_url || '')}
                      alt={challenge.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Trophy className="h-16 w-16 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  
                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {challenge.is_completed && (
                      <Badge className="bg-green-600 text-white border-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('challenges.completed', 'Completed')}
                      </Badge>
                    )}
                    {challenge.is_featured && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                        {t('challenges.featured', 'Featured')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Challenge Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-white group-hover:text-primary transition-colors">
                    {challenge.title}
                  </h3>
                  {challenge.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {challenge.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {challenge.is_completed ? (
                      <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
                        <ImageIcon className="h-4 w-4" />
                        <span>{t('challenges.see_my_drawing', 'See my drawing')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-primary text-sm font-medium">
                        <Play className="h-4 w-4" />
                        <span>{t('challenges.start_challenge', 'Start Challenge')}</span>
                      </div>
                    )}
                    {challenge.completed_at && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(challenge.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Completed Overlay Effect */}
                {challenge.is_completed && (
                  <div className="absolute inset-0 border-2 border-yellow-500/30 rounded-lg pointer-events-none"></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Archive Link */}
        <div className="mt-12 text-center">
          <Button
            variant="outline"
            onClick={() => navigateWithLocale('/challenge-archive')}
            className="border-white/20 hover:bg-white/10"
          >
            {t('challenges.view_archive', 'View Challenge Archive')}
          </Button>
        </div>
      </div>

      {/* Image View Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('challenges.my_drawing', 'My Drawing')}</DialogTitle>
            <DialogDescription>
              {t('challenges.completed_challenge_image', 'Your completed challenge submission')}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="mt-4">
              <img
                src={getImageUrl(selectedImage)}
                alt={t('challenges.my_drawing', 'My Drawing')}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Challenges;
