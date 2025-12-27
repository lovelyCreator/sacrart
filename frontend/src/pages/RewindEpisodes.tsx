import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { seriesApi, videoApi, Series, Video } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, MoreVertical, RotateCcw, Plus, ThumbsUp, ThumbsDown, ListOrdered, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Transcription segment interface
interface TranscriptionSegment {
  time: string;
  text: string;
  isActive?: boolean;
}

const RewindEpisodes = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [series, setSeries] = useState<Series | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'episodios' | 'transcripcion'>('episodios');

  // Sample transcription data
  const [transcription] = useState<TranscriptionSegment[]>([
    { time: '04:15', text: 'Para el dorado, es fundamental la temperatura. La madera respira, se expande y contrae con el calor del taller.', isActive: false },
    { time: '04:20', text: 'Así que vamos a calentarla al baño maría. Es un proceso delicado, casi alquímico, donde el material cambia de estado ante nuestros ojos.', isActive: true },
    { time: '04:25', text: 'Si hierve, perderá su fuerza adhesiva. Se volverá quebradiza y el oro no se fijará como debe sobre la superficie preparada.', isActive: false },
    { time: '04:32', text: 'Observad la consistencia. Debe fluir como miel caliente, ni muy líquida ni muy espesa. Es el punto exacto que buscamos.', isActive: false },
    { time: '04:45', text: 'Aplicamos la primera capa con suavidad. El pincel apenas roza la madera, depositando la mezcla en los poros abiertos.', isActive: false },
    { time: '05:10', text: 'El silencio es necesario aquí. Cualquier distracción podría arruinar horas de preparación. La concentración debe ser absoluta.', isActive: false },
  ]);

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Cargar serie y videos
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Always set sample data first (for now, until real API is ready)
        const sampleSeries: Series = {
          id: parseInt(id || '1'),
          name: 'Virgen de Filipinas',
          title: 'Virgen de Filipinas',
          slug: 'virgen-de-filipinas',
          description: 'Proceso completo de creación de una escultura sacra desde el bloque inicial hasta la policromía final.',
          short_description: 'Proceso completo de escultura sacra',
          visibility: 'freemium',
          status: 'published',
          category_id: 1,
          instructor_id: 1,
          thumbnail: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
          cover_image: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
          image: null,
          trailer_url: null,
          meta_title: null,
          meta_description: null,
          meta_keywords: null,
          video_count: 5,
          total_duration: 3600,
          total_views: 1500,
          rating: '4.8',
          rating_count: 120,
          price: null,
          is_free: true,
          published_at: new Date(2023, 0, 15).toISOString(), // 2023 as per code.html
          featured_until: null,
          is_featured: true,
          sort_order: 1,
          tags: ['talla', 'escultura', 'sacra'],
          created_at: new Date(2023, 0, 1).toISOString(),
          updated_at: new Date(2023, 0, 15).toISOString(),
        };
        setSeries(sampleSeries);

        // Set sample videos immediately
        const sampleVideos: Video[] = [
          {
            id: 2001,
            title: 'Preparación del Bloque',
            slug: 'preparacion-bloque',
            description: 'Comenzamos el desbastado del bloque de cedro, una madera noble seleccionada por su durabilidad y aroma. En este primer episodio, exploramos la preparación de la materia prima antes de que la gubia haga su primer corte decisivo.',
            short_description: 'Preparación del Bloque',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_description: null,
            duration: 840, // 14:00
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: 1,
            sort_order: 1,
            tags: ['talla', 'proceso'],
            views: 500,
            unique_views: 350,
            rating: '4.8',
            rating_count: 45,
            completion_rate: 82,
            published_at: new Date(2023, 0, 15).toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date(2023, 0, 15).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2002,
            title: 'El Desbastado',
            slug: 'el-desbastado',
            description: 'El uso de la gubia para eliminar el material sobrante y encontrar la forma latente.',
            short_description: 'El Desbastado',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_description: null,
            duration: 1110, // 18:30
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: 2,
            sort_order: 2,
            tags: ['talla', 'gubia'],
            views: 450,
            unique_views: 320,
            rating: '4.9',
            rating_count: 38,
            completion_rate: 75,
            published_at: new Date(2023, 0, 20).toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date(2023, 0, 20).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2003,
            title: 'Definición de Volúmenes',
            slug: 'definicion-volumenes',
            description: 'Modelando los pliegues del manto y la expresión facial con herramientas de precisión.',
            short_description: 'Definición de Volúmenes',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 1335, // 22:15
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: 3,
            sort_order: 3,
            tags: ['modelado', 'volúmenes'],
            views: 380,
            unique_views: 280,
            rating: '5.0',
            rating_count: 32,
            completion_rate: 68,
            published_at: new Date(2023, 0, 25).toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date(2023, 0, 25).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2004,
            title: 'La Mirada',
            slug: 'la-mirada',
            description: 'Próximamente',
            short_description: 'La Mirada',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 0,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'premium',
            status: 'draft',
            is_free: false,
            price: null,
            episode_number: 4,
            sort_order: 4,
            tags: ['próximamente'],
            views: 0,
            unique_views: 0,
            rating: null,
            rating_count: 0,
            completion_rate: 0,
            published_at: null,
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'pending',
            processing_error: null,
            processed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2005,
            title: 'El Alma de la Madera',
            slug: 'el-alma-de-la-madera',
            description: 'Próximamente',
            short_description: 'El Alma de la Madera',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 0,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'premium',
            status: 'draft',
            is_free: false,
            price: null,
            episode_number: 5,
            sort_order: 5,
            tags: ['próximamente'],
            views: 0,
            unique_views: 0,
            rating: null,
            rating_count: 0,
            completion_rate: 0,
            published_at: null,
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'pending',
            processing_error: null,
            processed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setVideos(sampleVideos);
        setCurrentVideo(sampleVideos[0]);
        setCurrentVideoIndex(0);

        // Try to load real data (commented out for now, will use sample data)
        /*
        // Cargar serie
        const seriesResponse = await seriesApi.getById(parseInt(id));
        if (seriesResponse.success && seriesResponse.data) {
          setSeries(seriesResponse.data.series);
        }

        // Cargar videos de la serie
        const videosResponse = await videoApi.getPublic({
          category_id: parseInt(id),
          status: 'published',
          sort_by: 'episode',
          sort_order: 'asc',
          per_page: 100,
        });

        */
        
        // For now, always use sample data
        // When real API is ready, uncomment the above code and remove this section
        /*
        if (videosResponse.success && videosResponse.data) {
          const seriesVideos = videosResponse.data.data;
          if (seriesVideos.length > 0) {
            setVideos(seriesVideos);
            setCurrentVideo(seriesVideos[0]);
            setCurrentVideoIndex(0);
          } else {
            // Add sample videos if none found - matching code.html (5 episodes)
            const sampleVideos: Video[] = [
              {
                id: 2001,
                title: 'Preparación del Bloque',
                slug: 'preparacion-bloque',
                description: 'Comenzamos el desbastado del bloque de cedro, una madera noble seleccionada por su durabilidad y aroma. En este primer episodio, exploramos la preparación de la materia prima antes de que la gubia haga su primer corte decisivo.',
                short_description: 'Preparación del Bloque',
                series_id: parseInt(id),
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_description: null,
                duration: 840, // 14:00
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'freemium',
                status: 'published',
                is_free: true,
                price: null,
                episode_number: 1,
                sort_order: 1,
                tags: ['talla', 'proceso'],
                views: 500,
                unique_views: 350,
                rating: '4.8',
                rating_count: 45,
                completion_rate: 82,
                published_at: new Date(2023, 0, 15).toISOString(),
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'completed',
                processing_error: null,
                processed_at: new Date().toISOString(),
                created_at: new Date(2023, 0, 15).toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 2002,
                title: 'El Desbastado',
                slug: 'el-desbastado',
                description: 'El uso de la gubia para eliminar el material sobrante y encontrar la forma latente.',
                short_description: 'El Desbastado',
                series_id: parseInt(id),
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_description: null,
                duration: 1110, // 18:30
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'freemium',
                status: 'published',
                is_free: true,
                price: null,
                episode_number: 2,
                sort_order: 2,
                tags: ['talla', 'gubia'],
                views: 450,
                unique_views: 320,
                rating: '4.9',
                rating_count: 38,
                completion_rate: 75,
                published_at: new Date(2023, 0, 20).toISOString(),
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'completed',
                processing_error: null,
                processed_at: new Date().toISOString(),
                created_at: new Date(2023, 0, 20).toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 2003,
                title: 'Definición de Volúmenes',
                slug: 'definicion-volumenes',
                description: 'Modelando los pliegues del manto y la expresión facial con herramientas de precisión.',
                short_description: 'Definición de Volúmenes',
                series_id: parseInt(id),
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_description: null,
                duration: 1335, // 22:15
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'freemium',
                status: 'published',
                is_free: true,
                price: null,
                episode_number: 3,
                sort_order: 3,
                tags: ['modelado', 'volúmenes'],
                views: 380,
                unique_views: 280,
                rating: '5.0',
                rating_count: 32,
                completion_rate: 68,
                published_at: new Date(2023, 0, 25).toISOString(),
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'completed',
                processing_error: null,
                processed_at: new Date().toISOString(),
                created_at: new Date(2023, 0, 25).toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 2004,
                title: 'La Mirada',
                slug: 'la-mirada',
                description: 'Próximamente',
                short_description: 'La Mirada',
                series_id: parseInt(id),
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_description: null,
                duration: 0,
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'premium',
                status: 'draft',
                is_free: false,
                price: null,
                episode_number: 4,
                sort_order: 4,
                tags: ['próximamente'],
                views: 0,
                unique_views: 0,
                rating: null,
                rating_count: 0,
                completion_rate: 0,
                published_at: null,
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'pending',
                processing_error: null,
                processed_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 2005,
                title: 'El Alma de la Madera',
                slug: 'el-alma-de-la-madera',
                description: 'Próximamente',
                short_description: 'El Alma de la Madera',
                series_id: parseInt(id),
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_description: null,
                duration: 0,
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'premium',
                status: 'draft',
                is_free: false,
                price: null,
                episode_number: 5,
                sort_order: 5,
                tags: ['próximamente'],
                views: 0,
                unique_views: 0,
                rating: null,
                rating_count: 0,
                completion_rate: 0,
                published_at: null,
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'pending',
                processing_error: null,
                processed_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
            setVideos(sampleVideos);
            setCurrentVideo(sampleVideos[0]);
            setCurrentVideoIndex(0);
          }
        }
        */
        
      } catch (error: any) {
        console.error('Error loading series data:', error);
        // Sample data is already set above, so no need to set it again here
        const sampleSeries: Series = {
          id: parseInt(id || '1'),
          name: 'Virgen de Filipinas',
          title: 'Virgen de Filipinas',
          slug: 'virgen-de-filipinas',
          description: 'Proceso completo de creación de una escultura sacra desde el bloque inicial hasta la policromía final.',
          short_description: 'Proceso completo de escultura sacra',
          visibility: 'freemium',
          status: 'published',
          category_id: 1,
          instructor_id: 1,
          thumbnail: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
          cover_image: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
          image: null,
          trailer_url: null,
          meta_title: null,
          meta_description: null,
          meta_keywords: null,
          video_count: 5,
          total_duration: 3600,
          total_views: 1500,
          rating: '4.8',
          rating_count: 120,
          price: null,
          is_free: true,
          published_at: new Date(2023, 0, 15).toISOString(),
          featured_until: null,
          is_featured: true,
          sort_order: 1,
          tags: ['talla', 'escultura', 'sacra'],
          created_at: new Date(2023, 0, 1).toISOString(),
          updated_at: new Date(2023, 0, 15).toISOString(),
        };
        setSeries(sampleSeries);

        // Set sample videos
        const sampleVideos: Video[] = [
          {
            id: 2001,
            title: 'Preparación del Bloque',
            slug: 'preparacion-bloque',
            description: 'Comenzamos el desbastado del bloque de cedro, una madera noble seleccionada por su durabilidad y aroma. En este primer episodio, exploramos la preparación de la materia prima antes de que la gubia haga su primer corte decisivo.',
            short_description: 'Preparación del Bloque',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_description: null,
            duration: 840,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: 1,
            sort_order: 1,
            tags: ['talla', 'proceso'],
            views: 500,
            unique_views: 350,
            rating: '4.8',
            rating_count: 45,
            completion_rate: 82,
            published_at: new Date(2023, 0, 15).toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date(2023, 0, 15).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2002,
            title: 'El Desbastado',
            slug: 'el-desbastado',
            description: 'El uso de la gubia para eliminar el material sobrante y encontrar la forma latente.',
            short_description: 'El Desbastado',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
            intro_description: null,
            duration: 1110,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: 2,
            sort_order: 2,
            tags: ['talla', 'gubia'],
            views: 450,
            unique_views: 320,
            rating: '4.9',
            rating_count: 38,
            completion_rate: 75,
            published_at: new Date(2023, 0, 20).toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date(2023, 0, 20).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2003,
            title: 'Definición de Volúmenes',
            slug: 'definicion-volumenes',
            description: 'Modelando los pliegues del manto y la expresión facial con herramientas de precisión.',
            short_description: 'Definición de Volúmenes',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 1335,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: 3,
            sort_order: 3,
            tags: ['modelado', 'volúmenes'],
            views: 380,
            unique_views: 280,
            rating: '5.0',
            rating_count: 32,
            completion_rate: 68,
            published_at: new Date(2023, 0, 25).toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date(2023, 0, 25).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2004,
            title: 'La Mirada',
            slug: 'la-mirada',
            description: 'Próximamente',
            short_description: 'La Mirada',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 0,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'premium',
            status: 'draft',
            is_free: false,
            price: null,
            episode_number: 4,
            sort_order: 4,
            tags: ['próximamente'],
            views: 0,
            unique_views: 0,
            rating: null,
            rating_count: 0,
            completion_rate: 0,
            published_at: null,
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'pending',
            processing_error: null,
            processed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2005,
            title: 'El Alma de la Madera',
            slug: 'el-alma-de-la-madera',
            description: 'Próximamente',
            short_description: 'El Alma de la Madera',
            series_id: parseInt(id || '1'),
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 0,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'premium',
            status: 'draft',
            is_free: false,
            price: null,
            episode_number: 5,
            sort_order: 5,
            tags: ['próximamente'],
            views: 0,
            unique_views: 0,
            rating: null,
            rating_count: 0,
            completion_rate: 0,
            published_at: null,
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'pending',
            processing_error: null,
            processed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setVideos(sampleVideos);
        setCurrentVideo(sampleVideos[0]);
        setCurrentVideoIndex(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, t]);

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (video: Video, index: number) => {
    setCurrentVideo(video);
    setCurrentVideoIndex(index);
    setIsPlaying(true);
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      handleVideoClick(videos[nextIndex], nextIndex);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevIndex = currentVideoIndex - 1;
      handleVideoClick(videos[prevIndex], prevIndex);
    }
  };

  const getYear = (dateString: string | null | undefined) => {
    if (!dateString) return new Date().getFullYear().toString();
    return new Date(dateString).getFullYear().toString();
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

  if (!series || !currentVideo) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">{t('rewind.series_not_found', 'Serie no encontrada')}</p>
          <button
            onClick={() => navigateWithLocale('/rewind')}
            className="px-6 py-2 bg-[#A05245] text-white rounded-full hover:bg-[#b56053] transition-colors"
          >
            {t('rewind.back_to_rewind', 'Volver a Rewind')}
          </button>
        </div>
      </main>
    );
  }

  const thumbnailUrl = getImageUrl(
    currentVideo.thumbnail_url || 
    currentVideo.intro_image_url || 
    currentVideo.bunny_thumbnail_url || 
    series.cover_image || 
    series.thumbnail || 
    series.image ||
    ''
  );

  return (
    <main className="flex-grow w-full relative min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0A0A0A] z-10"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#A05245]/10 rounded-full blur-[150px] z-0 opacity-50"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#C5A065]/5 rounded-full blur-[150px] z-0 opacity-40"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center blur-3xl opacity-10 z-0"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto p-6 lg:p-12 lg:pt-16 flex flex-col lg:flex-row gap-16 items-start justify-center">
        {/* Video Player Section */}
        <div className="w-full lg:w-[450px] flex-shrink-0 mx-auto sticky top-24">
          <div className="relative aspect-[9/16] bg-stone-900 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.7)] border border-white/10 group ring-1 ring-white/5">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={currentVideo.title || ''}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-black"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-90"></div>
          <div className="absolute inset-0 bg-black/10"></div>

          {/* Video Info Overlay */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start text-white z-20">
            <span className="bg-white/10 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-white/10 rounded-sm shadow-sm">
              S1 • EP{String(currentVideoIndex + 1).padStart(2, '0')}
            </span>
            <button className="text-white/80 hover:text-white transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-[#A05245] hover:border-[#A05245] transition-all transform hover:scale-110 shadow-2xl"
            >
              {isPlaying ? (
                <Pause className="h-12 w-12 text-white" fill="currentColor" />
              ) : (
                <Play className="h-16 w-16 text-white ml-1" fill="currentColor" />
              )}
            </button>
          </div>

          {/* Video Controls Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-30 bg-gradient-to-t from-black via-black/80 to-transparent pt-24">
            <div className="flex justify-end mb-6">
              <button
                onClick={handleNextVideo}
                disabled={currentVideoIndex >= videos.length - 1}
                className="group/btn relative overflow-hidden bg-white text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#A05245] hover:text-white transition-all shadow-lg flex items-center gap-2 transform translate-y-0 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('rewind.next', 'Siguiente')} <span className="hidden group-hover/btn:inline">{t('rewind.episode', 'Episodio')}</span>
                </span>
                <SkipForward className="h-4 w-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3 mb-4 group/progress">
              <div className="relative h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden group-hover/progress:h-2 transition-all">
                <div className="absolute top-0 left-0 h-full w-[45%] bg-white/10 z-0"></div>
                <div className="absolute top-0 left-0 h-full w-[15%] bg-[#A05245] z-10 shadow-[0_0_10px_rgba(160,82,69,0.8)]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-medium text-gray-400 tracking-wider font-mono">
                <span className="text-white">02:14</span>
                <span>{formatDuration(currentVideo.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center text-gray-200">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="hover:text-[#A05245] transition-colors transform hover:scale-110"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" fill="currentColor" />
                  )}
                </button>
                <button className="hover:text-[#A05245] transition-colors transform hover:scale-110">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <div className="group/vol flex items-center gap-2">
                  <button className="hover:text-[#A05245] transition-colors">
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300">
                    <div className="h-1 bg-white/30 rounded-full w-14 ml-1">
                      <div className="h-full w-2/3 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-[#A05245] transition-colors text-xs font-bold border border-white/30 rounded px-1">
                  CC
                </button>
                <button className="hover:text-[#A05245] transition-colors transform hover:scale-110">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 w-full lg:max-w-3xl pt-2 lg:pt-0">
        <div className="mb-10 border-b border-white/10 pb-8 relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A05245] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A05245]"></span>
            </span>
            <span className="text-[#A05245] text-xs font-bold tracking-[0.2em] uppercase">
              {t('rewind.watching_now', 'Viendo Ahora')}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 leading-tight">
            {series.title || series.name || ''}
          </h1>
          <h2 className="text-xl text-gray-200 font-serif mb-5 font-medium tracking-wide">
            {t('rewind.chapter', 'Capítulo {current} de {total}', { 
              current: currentVideoIndex + 1, 
              total: videos.length 
            })} • <span className="text-[#A05245]">{currentVideo.title || ''}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400 font-medium mb-6 tracking-wide">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/5">4K HDR</span>
              <span className="bg-[#A05245]/20 text-[#A05245] px-2 py-0.5 rounded text-[10px] font-bold border border-[#A05245]/20">T +7</span>
            </div>
            <span>{getYear(series.published_at)}</span>
            <span className="text-white/20">•</span>
            <span className="text-white">{series.name || series.title || t('rewind.documentary', 'Documental')}</span>
          </div>
          <p className="text-gray-300 text-base lg:text-lg leading-relaxed font-light font-sans max-w-2xl mb-8">
            {currentVideo.description || currentVideo.short_description || series.description || ''}
          </p>
          <div className="flex gap-6">
            <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white group-hover:bg-white/5 transition-all">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{t('rewind.my_list', 'Mi Lista')}</span>
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group transition-all hover:bg-white/5 hover:border-[#A05245] focus:border-[#A05245] outline-none" title={t('rewind.like', 'Me gusta')}>
              <ThumbsUp className="h-5 w-5 text-white group-hover:text-[#A05245] group-focus:text-[#A05245] transition-colors" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group transition-all hover:bg-white/5 hover:border-[#A05245] focus:border-[#A05245] outline-none" title={t('rewind.dislike', 'No me gusta')}>
              <ThumbsDown className="h-5 w-5 text-white group-hover:text-[#A05245] group-focus:text-[#A05245] transition-colors" />
            </button>
          </div>
        </div>

          {/* Tabs */}
          <div className="mb-8 border-b border-white/10 flex items-center gap-8">
            <button
              onClick={() => setActiveTab('episodios')}
              className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                activeTab === 'episodios'
                  ? 'text-white border-b-2 border-[#A05245]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('rewind.episodes', 'Episodios')}
            </button>
            <button
              onClick={() => setActiveTab('transcripcion')}
              className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                activeTab === 'transcripcion'
                  ? 'text-white border-b-2 border-[#A05245]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('rewind.transcription', 'Transcripción')}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto relative">
            {activeTab === 'transcripcion' ? (
              <div className="py-6 space-y-8 max-w-3xl">
                {transcription.map((segment, index) => (
                  <div
                    key={index}
                    className={`group flex gap-6 ${
                      segment.isActive
                        ? 'relative'
                        : 'opacity-50 hover:opacity-80 transition-opacity cursor-pointer'
                    }`}
                  >
                    {segment.isActive && (
                      <div className="absolute -left-12 top-0 bottom-0 w-1 bg-[#A05245] rounded-r"></div>
                    )}
                    <span className={`font-mono text-xs pt-1 ${
                      segment.isActive ? 'text-white font-bold' : 'text-gray-500'
                    }`}>
                      {segment.time}
                    </span>
                    <p className={`leading-relaxed ${
                      segment.isActive
                        ? 'text-lg text-white font-normal'
                        : 'text-base text-gray-300 font-light'
                    }`}>
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif font-bold text-white tracking-widest flex items-center gap-3">
                    <ListOrdered className="h-5 w-5 text-[#A05245]" />
                    {t('rewind.episodes_list', 'Lista de Episodios')}
                  </h3>
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                    {videos.length} {t('rewind.chapters', 'Capítulos')}
                  </span>
                </div>
                <div className="flex flex-col border-t border-white/5">
                  {videos.map((video, index) => {
                    const isActive = index === currentVideoIndex;
                    const isLocked = video.status !== 'published';
                    
                    return (
                      <div
                        key={video.id}
                        onClick={() => !isLocked && handleVideoClick(video, index)}
                        className={`group flex justify-between items-center py-4 border-b ${
                          isActive ? 'border-white/10 text-[#A05245]' : 'border-white/5 text-gray-300 hover:text-white'
                        } cursor-pointer hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors duration-200 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className={`flex items-center gap-4 ${isActive ? 'font-semibold' : 'font-medium'} text-lg font-display`}>
                          {isActive ? (
                            <Play className="h-5 w-5 animate-pulse fill-current" />
                          ) : (
                            <span className="w-6 text-center text-sm font-sans text-gray-500 group-hover:text-[#A05245] transition-colors">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          )}
                          <span className={isActive ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}>
                            {isActive ? `${String(index + 1).padStart(2, '0')}. ${video.title || `${t('rewind.episode', 'Episodio')} ${index + 1}`}` : video.title || `${t('rewind.episode', 'Episodio')} ${index + 1}`}
                          </span>
                          {isLocked && (
                            <span className="text-xs uppercase tracking-wider font-sans border border-gray-700 rounded px-1.5 py-0.5">
                              {t('rewind.coming_soon', 'Próximamente')}
                            </span>
                          )}
                        </div>
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-gray-600" />
                        ) : (
                          <span className={`font-mono text-sm ${isActive ? 'opacity-100 font-medium' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="sticky bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RewindEpisodes;



