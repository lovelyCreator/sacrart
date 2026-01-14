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
  const challengeTitle = searchParams.get('title') || t('challenges.current_challenge');
  
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
          toast.info(t('challenges.already_completed'));
          navigateWithLocale('/challenge-archive');
        }
      }
    } catch (error: any) {
      console.error('Error fetching challenge:', error);
      toast.error(t('challenges.error_load'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Call this function after successful image generation
   * This will mark the challenge as completed and show the success modal
   * @param imageUrl - URL of the generated image
   * @param imageId - Optional video/image ID if stored in videos table
   * @param imagePath - Optional path to the image file
   */
  const handleGenerationSuccess = async (
    imageUrl: string,
    imageId?: number,
    imagePath?: string
  ) => {
    if (!challengeId) {
      toast.error(t('challenges.no_challenge_context'));
      return;
    }

    // Store the generated image info
    setGeneratedImageUrl(imageUrl);

    try {
      // Mark challenge as completed immediately after generation
      const response = await challengeApi.completeChallenge(parseInt(challengeId), {
        image_id: imageId,
        generated_image_url: imageUrl,
        generated_image_path: imagePath,
      });

      if (response.success) {
        // Show success modal directly
        setShowSuccessModal(true);
      } else {
        throw new Error(response.message || 'Failed to complete challenge');
      }
    } catch (error: any) {
      console.error('Error completing challenge:', error);
      toast.error(error.message || t('challenges.completion_error'));
    }
  };

  /**
   * Handle successful submission from the upload modal (for "Subir mi Propuesta" button)
   * This is called when user submits their work via the upload modal
   */
  const handleUploadSuccess = async () => {
    // The upload modal handles its own submission
    // This is just for closing the modal
    setShowUploadModal(false);
    toast.success(t('challenges.upload_success'));
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
            {t('challenges.no_challenge_selected')}
          </p>
          <Button onClick={() => navigateWithLocale('/challenge-archive')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('challenges.back_to_list')}
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
              {t('common.back')}
            </Button>
            <div className="h-6 w-px bg-gray-700"></div>
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {t('challenges.current_challenge')}: {decodeURIComponent(challengeTitle)}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {challenge && challenge.description && (
          <div className="bg-[#18181b] border border-white/10 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-2 text-white">
              {t('challenges.challenge_description')}
            </h2>
            <p className="text-gray-400">{challenge.description}</p>
            {challenge.instructions && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-md font-semibold mb-2 text-white">
                  {t('challenges.instructions')}
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
            {t('challenges.tool_integration_note')}
          </p>
          
          {/* Placeholder for your generation tool */}
          <div className="bg-[#0f0f0f] border-2 border-dashed border-gray-700 rounded-lg p-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {t('challenges.generation_tool_placeholder')}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal - Show when user clicks "Subir mi Propuesta" button (from ChallengeArchive page) */}
      {/* This modal is not shown automatically after generation - only when user explicitly requests it */}

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
