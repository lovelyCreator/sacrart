import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

interface ChallengeUploadModalProps {
  challenge: Challenge;
  onClose: () => void;
  onSuccess: () => void;
}

const ChallengeUploadModal = ({ challenge, onClose, onSuccess }: ChallengeUploadModalProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [processVideo, setProcessVideo] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverImageDropRef = useRef<HTMLDivElement>(null);
  const videoDropRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleCoverImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('challenges.invalid_image', 'Por favor selecciona una imagen válida'));
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error(t('challenges.image_too_large', 'La imagen no puede ser mayor a 10MB'));
      return;
    }

    setCoverImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error(t('challenges.invalid_video', 'Por favor selecciona un video válido'));
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB
      toast.error(t('challenges.video_too_large', 'El video no puede ser mayor a 100MB'));
      return;
    }

    setProcessVideo(file);
  };

  const handleDragOver = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (type === 'image') {
        handleCoverImageSelect(files[0]);
      } else {
        handleVideoSelect(files[0]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t('challenges.title_required', 'Por favor ingresa un título'));
      return;
    }

    if (!coverImage) {
      toast.error(t('challenges.cover_required', 'Por favor selecciona una foto de portada'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('auth_token');
      
      // Upload cover image
      const imageFormData = new FormData();
      imageFormData.append('image', coverImage);

      const imageResponse = await fetch(`${API_BASE_URL}/media/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: imageFormData,
      });

      if (!imageResponse.ok) {
        throw new Error('Failed to upload image');
      }

      setUploadProgress(50);

      // Upload video if provided
      let videoUrl = null;
      if (processVideo) {
        const videoFormData = new FormData();
        videoFormData.append('videos', processVideo);

        const videoResponse = await fetch(`${API_BASE_URL}/media/videos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: videoFormData,
        });

        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          if (videoData.success && videoData.data && videoData.data.length > 0) {
            videoUrl = videoData.data[0].url || videoData.data[0].path;
          }
        }
      }

      setUploadProgress(100);

      // Here you would typically create a submission record via API
      // For now, we'll just show success
      setTimeout(() => {
        setIsUploading(false);
        onSuccess();
      }, 500);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || t('challenges.upload_error', 'Error al subir la propuesta'));
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"></div>
      <div
        className="relative w-full max-w-lg bg-[#121212] border border-[#A05245]/30 rounded-xl shadow-[0_0_35px_rgba(160,82,69,0.15)] overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#121212]">
          <h3 className="text-lg font-bold text-white tracking-tight" id="modal-title">
            Nueva Participación: {challenge.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="title">
              Título de la Obra
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Estudio de movimiento en cedro..."
              className="w-full bg-[#18181b] border border-white/10 rounded-[4px] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#A05245] focus:ring-1 focus:ring-[#A05245] outline-none transition-all"
            />
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Foto de Portada (Pública)
            </label>
            <div
              ref={coverImageDropRef}
              onDragOver={(e) => handleDragOver(e, 'image')}
              onDrop={(e) => handleDrop(e, 'image')}
              onClick={() => coverImageInputRef.current?.click()}
              className="group w-full aspect-video border-2 border-dashed border-white/10 hover:border-[#A05245]/50 bg-[#18181b] rounded-[4px] flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#A05245]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {coverImagePreview ? (
                <div className="relative z-10 w-full h-full">
                  <img
                    src={coverImagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center text-center p-4">
                  <ImageIcon className="h-12 w-12 text-gray-500 group-hover:text-[#A05245] mb-2 transition-colors" />
                  <span className="text-sm font-medium text-gray-300 mb-1">Arrastra tu foto aquí</span>
                  <span className="text-xs text-gray-500">Se verá en el muro. Formato 16:9.</span>
                </div>
              )}
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleCoverImageSelect(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Vídeo del Proceso/Resultado (Privado)
            </label>
            <div className="w-full bg-[#18181b] border border-white/5 rounded-[4px] p-4 relative">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Video className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs text-gray-400">
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                      <span>Solo Horizontal (Landscape)</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span>HD 1080p</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span>Máx. 60 seg</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-[2px] transition-colors"
                >
                  SUBIR
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleVideoSelect(e.target.files[0]);
                    }
                  }}
                />
              </div>
              
              {processVideo && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {processVideo.name}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {(processVideo.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {uploadProgress < 100 ? 'Subiendo...' : 'Listo para cargar'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500">{uploadProgress}%</span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-1 mb-4 text-xs flex rounded-[1px] bg-white/5">
                    <div
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#A05245] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-[#0f0f10] border-t border-white/5 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest px-4 py-2"
            type="button"
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim() || !coverImage}
            className="bg-[#A05245] hover:bg-[#8f4539] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-8 py-3 rounded-[4px] uppercase tracking-widest shadow-lg shadow-[#A05245]/20 transition-all transform hover:-translate-y-0.5"
            type="button"
          >
            {isUploading ? 'Enviando...' : 'Enviar Propuesta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeUploadModal;






