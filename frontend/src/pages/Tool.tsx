import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/contexts/AuthContext';
import challengeApi, { Challenge } from '@/services/challengeApi';
import ChallengeSuccessModal from '@/components/ChallengeSuccessModal';
import ChallengeUploadModal from '@/components/ChallengeUploadModal';
import { toast } from 'sonner';
import { Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * AI Drawing Tool Page
 * 
 * This page integrates with the AI image generation tool.
 * When an image is successfully generated:
 * 1. Call handleGenerationSuccess(imageUrl, imageId?, imagePath?)
 * 2. This will mark the challenge as completed via API
 * 3. Show ChallengeSuccessModal with confetti
 * 4. On "Back to List", navigate to /challenge-archive
 * 
 * The challenge context is available from URL params:
 * - challenge: challenge ID
 * - title: challenge title (for display in header: "Current Challenge: [Title]")
 */
const Tool = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const challengeId = searchParams.get('challenge');
  const challengeTitle = searchParams.get('title') || t('challenges.current_challenge', 'Current Challenge');
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (challengeId) {
      fetchChallenge();
    } else {
      setLoading(false);
    }
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      if (!challengeId) return;
      
      setLoading(true);
      const response = await challengeApi.getOne(parseInt(challengeId));
      if (response.success && response.data) {
        const challengeData = response.data;
        setChallenge(challengeData);
        
        // If already completed, redirect to challenge archive
        if (challengeData.is_completed) {
          toast.info(t('challenges.already_completed', 'This challenge is already completed'));
          navigateWithLocale('/challenge-archive');
        }
      }
    } catch (error: any) {
      console.error('Error fetching challenge:', error);
      toast.error(t('challenges.error_load', 'Error loading challenge'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Call this function after successful image generation
   * This will show the upload modal for the user to submit their work
   * @param imageUrl - URL of the generated image
   * @param imageId - Optional video/image ID if stored in videos table
   * @param imagePath - Optional path to the image file
   */
  const handleGenerationSuccess = (
    imageUrl: string,
    imageId?: number,
    imagePath?: string
  ) => {
    // Store the generated image info
    setGeneratedImageUrl(imageUrl);
    // Show the upload modal for user to submit their work
    setShowUploadModal(true);
  };

  /**
   * Handle successful submission from the upload modal
   * This will mark the challenge as completed
   */
  const handleUploadSuccess = async () => {
    if (!challengeId || !generatedImageUrl) {
      toast.error(t('challenges.no_challenge_context', 'No challenge context found'));
      return;
    }

    try {
      // Mark challenge as completed
      const response = await challengeApi.completeChallenge(parseInt(challengeId), {
        generated_image_url: generatedImageUrl,
      });

      if (response.success) {
        setShowUploadModal(false);
        setShowSuccessModal(true);
      } else {
        throw new Error(response.message || 'Failed to complete challenge');
      }
    } catch (error: any) {
      console.error('Error completing challenge:', error);
      toast.error(error.message || t('challenges.completion_error', 'Failed to complete challenge'));
    }
  };

  const handleBackToList = () => {
    setShowSuccessModal(false);
    navigateWithLocale('/challenge-archive');
  };

  if (loading) {
    return (
      <main className="flex-1 w-full pt-32 bg-[#0f0f0f] min-h-screen font-display text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  if (!challengeId) {
    return (
      <main className="flex-1 w-full pt-32 bg-[#0f0f0f] min-h-screen font-display text-white">
        <div className="container mx-auto px-6 md:px-12 text-center py-20">
          <p className="text-gray-400 text-lg mb-6">
            {t('challenges.no_challenge_selected', 'No challenge selected')}
          </p>
          <Button onClick={() => navigateWithLocale('/challenge-archive')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('challenges.back_to_list', 'Back to List')}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full pt-20 bg-[#0f0f0f] min-h-screen font-display text-white">
      {/* Challenge Context Header */}
      <div className="container mx-auto px-6 md:px-12 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigateWithLocale('/challenge-archive')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('common.back', 'Back')}
            </Button>
            <div className="h-6 w-px bg-gray-700"></div>
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <Badge variant="outline" className="mb-1 border-primary text-primary">
                  {t('challenges.current_challenge', 'Current Challenge')}
                </Badge>
                <h1 className="text-2xl font-bold text-white">
                  {decodeURIComponent(challengeTitle)}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {challenge && challenge.description && (
          <div className="bg-[#18181b] border border-white/10 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-2 text-white">
              {t('challenges.challenge_description', 'Challenge Description')}
            </h2>
            <p className="text-gray-400">{challenge.description}</p>
            {challenge.instructions && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-md font-semibold mb-2 text-white">
                  {t('challenges.instructions', 'Instructions')}
                </h3>
                <p className="text-gray-400 whitespace-pre-line">{challenge.instructions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generation Tool Area */}
      <div className="container mx-auto px-6 md:px-12">
        <div className="bg-[#18181b] border border-white/10 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-6">
            {t('challenges.tool_integration_note', 'Integrate your image generation tool here. After successful generation, call handleGenerationSuccess(imageUrl, imageId?, imagePath?)')}
          </p>
          
          {/* Placeholder for your generation tool */}
          <div className="bg-[#0f0f0f] border-2 border-dashed border-gray-700 rounded-lg p-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {t('challenges.generation_tool_placeholder', 'Your image generation tool should be integrated here')}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                // Example: Simulate successful generation
                // Replace this with your actual generation logic
                const mockImageUrl = 'https://via.placeholder.com/800x600/4A5568/FFFFFF?text=Generated+Image';
                handleGenerationSuccess(mockImageUrl);
              }}
              className="mt-4"
            >
              {t('challenges.test_completion', 'Test Completion (Demo)')}
            </Button>
            
            {/* Button to open upload modal if image already generated */}
            {generatedImageUrl && !showUploadModal && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 bg-[#A05245] hover:bg-[#8f4539] text-white"
              >
                {t('challenges.submit_work', 'Submit My Work')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal - Show after image generation */}
      {showUploadModal && challenge && (
        <ChallengeUploadModal
          challenge={{
            id: challenge.id,
            title: challenge.title,
            month: challenge.start_date 
              ? new Date(challenge.start_date).toLocaleDateString('es-ES', { month: 'long' })
              : 'Reto',
            thumbnail: challenge.thumbnail_url || challenge.image_url || '',
            isActive: !challenge.is_completed || false,
            isCompleted: challenge.is_completed || false,
            endDate: challenge.end_date || undefined,
            description: challenge.description || undefined,
          }}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Success Modal */}
      <ChallengeSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        generatedImageUrl={generatedImageUrl || ''}
        challengeTitle={decodeURIComponent(challengeTitle)}
        onBackToList={handleBackToList}
      />
    </main>
  );
};

export default Tool;
