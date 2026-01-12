import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, CheckCircle2, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChallengeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedImageUrl: string;
  challengeTitle: string;
  onBackToList: () => void;
}

const ChallengeSuccessModal = ({
  isOpen,
  onClose,
  generatedImageUrl,
  challengeTitle,
  onBackToList,
}: ChallengeSuccessModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti effect
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    }
  }, [isOpen]);

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Trophy className="h-16 w-16 text-yellow-500" />
              <CheckCircle2 className="h-8 w-8 text-green-500 absolute -bottom-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <DialogTitle className="text-3xl font-bold text-center text-primary">
            {t('challenges.challenge_achieved', 'Challenge Achieved!')}
          </DialogTitle>
          <DialogDescription className="text-center text-lg mt-2">
            {t('challenges.success_message', 'Congratulations! You have successfully completed')} "{challengeTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {generatedImageUrl && (
            <div className="relative rounded-lg overflow-hidden border-2 border-primary/50 bg-gray-900">
              <img
                src={getImageUrl(generatedImageUrl)}
                alt={t('challenges.generated_image', 'Generated image')}
                className="w-full h-auto max-h-[500px] object-contain"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={onBackToList}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
            size="lg"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('challenges.back_to_list', 'Back to List')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeSuccessModal;
