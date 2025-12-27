import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { seriesApi, Series } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, ChevronDown, History } from 'lucide-react';
import { toast } from 'sonner';

const Rewind = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [displayedYearsCount, setDisplayedYearsCount] = useState(2);

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Cargar todas las series publicadas
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoading(true);
        const response = await seriesApi.getAll({
          status: 'published',
          per_page: 1000, // Obtener muchas series para filtrar localmente
        });
        
        if (response.success && response.data) {
          // Filtrar solo series que tengan published_at
          const publishedSeries = response.data.data.filter((s: Series) => 
            s.published_at && s.status === 'published'
          );
          
          // If no series found, add sample data
          if (publishedSeries.length === 0) {
            const sampleSeries: Series[] = [
              {
                id: 1,
                name: 'Virgen de Filipinas',
                title: 'Virgen de Filipinas',
                slug: 'virgen-de-filipinas',
                description: 'Proceso completo de creación de una escultura sacra desde el bloque inicial hasta la policromía final.',
                short_description: 'Proceso completo de escultura sacra',
                visibility: 'freemium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 3,
                total_duration: 3600,
                total_views: 1500,
                rating: '4.8',
                rating_count: 120,
                price: null,
                is_free: true,
                published_at: new Date(2024, 0, 15).toISOString(),
                featured_until: null,
                is_featured: true,
                sort_order: 1,
                tags: ['talla', 'escultura', 'sacra'],
                created_at: new Date(2024, 0, 1).toISOString(),
                updated_at: new Date(2024, 0, 15).toISOString(),
              },
              {
                id: 2,
                name: 'San José con el Niño',
                title: 'San José con el Niño',
                slug: 'san-jose-con-el-nino',
                description: 'Técnicas avanzadas de modelado y policromía en una escultura de San José.',
                short_description: 'Técnicas avanzadas de modelado',
                visibility: 'premium',
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
                total_duration: 7200,
                total_views: 2300,
                rating: '4.9',
                rating_count: 180,
                price: null,
                is_free: false,
                published_at: new Date(2023, 8, 20).toISOString(),
                featured_until: null,
                is_featured: false,
                sort_order: 2,
                tags: ['modelado', 'policromía'],
                created_at: new Date(2023, 8, 1).toISOString(),
                updated_at: new Date(2023, 8, 20).toISOString(),
              },
              {
                id: 3,
                name: 'Restauración de Retablo',
                title: 'Restauración de Retablo Barroco',
                slug: 'restauracion-retablo-barroco',
                description: 'Proceso completo de restauración de un retablo barroco del siglo XVII.',
                short_description: 'Restauración de retablo barroco',
                visibility: 'premium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 8,
                total_duration: 14400,
                total_views: 3200,
                rating: '5.0',
                rating_count: 250,
                price: null,
                is_free: false,
                published_at: new Date(2023, 2, 10).toISOString(),
                featured_until: null,
                is_featured: true,
                sort_order: 3,
                tags: ['restauración', 'barroco'],
                created_at: new Date(2023, 2, 1).toISOString(),
                updated_at: new Date(2023, 2, 10).toISOString(),
              },
              {
                id: 4,
                name: 'Dorado de Altar',
                title: 'Técnicas de Dorado en Altar',
                slug: 'dorado-altar',
                description: 'Aplicación de técnicas tradicionales de dorado en un altar del siglo XVIII.',
                short_description: 'Técnicas de dorado tradicional',
                visibility: 'premium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1000&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1000&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 4,
                total_duration: 5400,
                total_views: 1800,
                rating: '4.7',
                rating_count: 95,
                price: null,
                is_free: false,
                published_at: new Date(2022, 5, 15).toISOString(),
                featured_until: null,
                is_featured: false,
                sort_order: 4,
                tags: ['dorado', 'técnicas tradicionales'],
                created_at: new Date(2022, 5, 1).toISOString(),
                updated_at: new Date(2022, 5, 15).toISOString(),
              },
              {
                id: 5,
                name: 'Policromía Renacentista',
                title: 'Policromía en Escultura Renacentista',
                slug: 'policromia-renacentista',
                description: 'Estudio y aplicación de técnicas de policromía del Renacimiento.',
                short_description: 'Policromía renacentista',
                visibility: 'freemium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 6,
                total_duration: 10800,
                total_views: 2100,
                rating: '4.9',
                rating_count: 140,
                price: null,
                is_free: true,
                published_at: new Date(2022, 0, 20).toISOString(),
                featured_until: null,
                is_featured: true,
                sort_order: 5,
                tags: ['policromía', 'renacimiento'],
                created_at: new Date(2022, 0, 1).toISOString(),
                updated_at: new Date(2022, 0, 20).toISOString(),
              },
              {
                id: 6,
                name: 'Estudio de Iconografía',
                title: 'Estudio de Iconografía Sacra',
                slug: 'estudio-iconografia',
                description: 'Análisis profundo de la iconografía en el arte sacra.',
                short_description: 'Iconografía sacra',
                visibility: 'premium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=1000&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=1000&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 5,
                total_duration: 9000,
                total_views: 1900,
                rating: '4.6',
                rating_count: 110,
                price: null,
                is_free: false,
                published_at: new Date(2021, 7, 10).toISOString(),
                featured_until: null,
                is_featured: false,
                sort_order: 6,
                tags: ['estudio', 'iconografía'],
                created_at: new Date(2021, 7, 1).toISOString(),
                updated_at: new Date(2021, 7, 10).toISOString(),
              },
              {
                id: 7,
                name: 'Exhibición Virtual',
                title: 'Exhibición Virtual de Obras',
                slug: 'exhibicion-virtual',
                description: 'Recorrido virtual por las obras restauradas y creadas.',
                short_description: 'Exhibición virtual',
                visibility: 'freemium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?q=80&w=1000&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?q=80&w=1000&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 2,
                total_duration: 3600,
                total_views: 1200,
                rating: '4.5',
                rating_count: 80,
                price: null,
                is_free: true,
                published_at: new Date(2021, 3, 5).toISOString(),
                featured_until: null,
                is_featured: false,
                sort_order: 7,
                tags: ['exhibición', 'virtual'],
                created_at: new Date(2021, 3, 1).toISOString(),
                updated_at: new Date(2021, 3, 5).toISOString(),
              },
              {
                id: 8,
                name: 'Investigación Histórica',
                title: 'Investigación Histórica del Arte',
                slug: 'investigacion-historica',
                description: 'Metodologías de investigación histórica aplicadas al arte sacra.',
                short_description: 'Investigación histórica',
                visibility: 'premium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 7,
                total_duration: 12600,
                total_views: 1600,
                rating: '4.8',
                rating_count: 100,
                price: null,
                is_free: false,
                published_at: new Date(2020, 10, 15).toISOString(),
                featured_until: null,
                is_featured: true,
                sort_order: 8,
                tags: ['investigación', 'histórica'],
                created_at: new Date(2020, 10, 1).toISOString(),
                updated_at: new Date(2020, 10, 15).toISOString(),
              },
              {
                id: 9,
                name: 'Talla en Madera',
                title: 'Técnicas de Talla en Madera',
                slug: 'talla-madera',
                description: 'Fundamentos y técnicas avanzadas de talla en madera para escultura sacra.',
                short_description: 'Talla en madera',
                visibility: 'freemium',
                status: 'published',
                category_id: 1,
                instructor_id: 1,
                thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1000&auto=format&fit=crop',
                cover_image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1000&auto=format&fit=crop',
                image: null,
                trailer_url: null,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                video_count: 4,
                total_duration: 7200,
                total_views: 1400,
                rating: '4.6',
                rating_count: 90,
                price: null,
                is_free: true,
                published_at: new Date(2019, 4, 12).toISOString(),
                featured_until: null,
                is_featured: false,
                sort_order: 9,
                tags: ['talla', 'madera'],
                created_at: new Date(2019, 4, 1).toISOString(),
                updated_at: new Date(2019, 4, 12).toISOString(),
              },
            ];
            setSeries(sampleSeries);
          } else {
            setSeries(publishedSeries);
          }
        } else {
          // Add sample data if API fails
          const sampleSeries: Series[] = [
            {
              id: 1,
              name: 'Virgen de Filipinas',
              title: 'Virgen de Filipinas',
              slug: 'virgen-de-filipinas',
              description: 'Proceso completo de creación de una escultura sacra desde el bloque inicial hasta la policromía final.',
              short_description: 'Proceso completo de escultura sacra',
              visibility: 'freemium',
              status: 'published',
              category_id: 1,
              instructor_id: 1,
              thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              cover_image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              image: null,
              trailer_url: null,
              meta_title: null,
              meta_description: null,
              meta_keywords: null,
              video_count: 3,
              total_duration: 3600,
              total_views: 1500,
              rating: '4.8',
              rating_count: 120,
              price: null,
              is_free: true,
              published_at: new Date(2024, 0, 15).toISOString(),
              featured_until: null,
              is_featured: true,
              sort_order: 1,
              tags: ['talla', 'escultura', 'sacra'],
              created_at: new Date(2024, 0, 1).toISOString(),
              updated_at: new Date(2024, 0, 15).toISOString(),
            },
          ];
          setSeries(sampleSeries);
        }
      } catch (error: any) {
        console.error('Error loading series:', error);
        // Add sample data on error with multiple years
        const sampleSeries: Series[] = [
          {
            id: 1,
            name: 'Virgen de Filipinas',
            title: 'Virgen de Filipinas',
            slug: 'virgen-de-filipinas',
            description: 'Proceso completo de creación de una escultura sacra desde el bloque inicial hasta la policromía final.',
            short_description: 'Proceso completo de escultura sacra',
            visibility: 'freemium',
            status: 'published',
            category_id: 1,
            instructor_id: 1,
            thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            cover_image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            image: null,
            trailer_url: null,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            video_count: 3,
            total_duration: 3600,
            total_views: 1500,
            rating: '4.8',
            rating_count: 120,
            price: null,
            is_free: true,
            published_at: new Date(2024, 0, 15).toISOString(),
            featured_until: null,
            is_featured: true,
            sort_order: 1,
            tags: ['talla', 'escultura', 'sacra'],
            created_at: new Date(2024, 0, 1).toISOString(),
            updated_at: new Date(2024, 0, 15).toISOString(),
          },
          {
            id: 2,
            name: 'San José con el Niño',
            title: 'San José con el Niño',
            slug: 'san-jose-con-el-nino',
            description: 'Técnicas avanzadas de modelado y policromía en una escultura de San José.',
            short_description: 'Técnicas avanzadas de modelado',
            visibility: 'premium',
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
            total_duration: 7200,
            total_views: 2300,
            rating: '4.9',
            rating_count: 180,
            price: null,
            is_free: false,
            published_at: new Date(2023, 8, 20).toISOString(),
            featured_until: null,
            is_featured: false,
            sort_order: 2,
            tags: ['modelado', 'policromía'],
            created_at: new Date(2023, 8, 1).toISOString(),
            updated_at: new Date(2023, 8, 20).toISOString(),
          },
          {
            id: 3,
            name: 'Restauración de Retablo',
            title: 'Restauración de Retablo Barroco',
            slug: 'restauracion-retablo-barroco',
            description: 'Proceso completo de restauración de un retablo barroco del siglo XVII.',
            short_description: 'Restauración de retablo barroco',
            visibility: 'premium',
            status: 'published',
            category_id: 1,
            instructor_id: 1,
            thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            cover_image: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            image: null,
            trailer_url: null,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            video_count: 8,
            total_duration: 14400,
            total_views: 3200,
            rating: '5.0',
            rating_count: 250,
            price: null,
            is_free: false,
            published_at: new Date(2022, 5, 15).toISOString(),
            featured_until: null,
            is_featured: true,
            sort_order: 3,
            tags: ['restauración', 'barroco'],
            created_at: new Date(2022, 5, 1).toISOString(),
            updated_at: new Date(2022, 5, 15).toISOString(),
          },
          {
            id: 4,
            name: 'Dorado de Altar',
            title: 'Técnicas de Dorado en Altar',
            slug: 'dorado-altar',
            description: 'Aplicación de técnicas tradicionales de dorado en un altar del siglo XVIII.',
            short_description: 'Técnicas de dorado tradicional',
            visibility: 'premium',
            status: 'published',
            category_id: 1,
            instructor_id: 1,
            thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1000&auto=format&fit=crop',
            cover_image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1000&auto=format&fit=crop',
            image: null,
            trailer_url: null,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            video_count: 4,
            total_duration: 5400,
            total_views: 1800,
            rating: '4.7',
            rating_count: 95,
            price: null,
            is_free: false,
            published_at: new Date(2021, 7, 10).toISOString(),
            featured_until: null,
            is_featured: false,
            sort_order: 4,
            tags: ['dorado', 'técnicas tradicionales'],
            created_at: new Date(2021, 7, 1).toISOString(),
            updated_at: new Date(2021, 7, 10).toISOString(),
          },
          {
            id: 5,
            name: 'Policromía Renacentista',
            title: 'Policromía en Escultura Renacentista',
            slug: 'policromia-renacentista',
            description: 'Estudio y aplicación de técnicas de policromía del Renacimiento.',
            short_description: 'Policromía renacentista',
            visibility: 'freemium',
            status: 'published',
            category_id: 1,
            instructor_id: 1,
            thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
            cover_image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
            image: null,
            trailer_url: null,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            video_count: 6,
            total_duration: 10800,
            total_views: 2100,
            rating: '4.9',
            rating_count: 140,
            price: null,
            is_free: true,
            published_at: new Date(2020, 10, 15).toISOString(),
            featured_until: null,
            is_featured: true,
            sort_order: 5,
            tags: ['policromía', 'renacimiento'],
            created_at: new Date(2020, 10, 1).toISOString(),
            updated_at: new Date(2020, 10, 15).toISOString(),
          },
        ];
        setSeries(sampleSeries);
        toast.error(error.message || t('rewind.error_load', 'Error al cargar las series'));
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, [t]);

  // Extraer años únicos de las series (ordenados de más reciente a más antiguo)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    series.forEach((s) => {
      if (s.published_at) {
        const year = new Date(s.published_at).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Más reciente primero
  }, [series]);

  // Filtrar series por año seleccionado
  const filteredSeries = useMemo(() => {
    if (!selectedYear) return series;
    return series.filter((s) => {
      if (!s.published_at) return false;
      const year = new Date(s.published_at).getFullYear();
      return year === selectedYear;
    });
  }, [series, selectedYear]);

  // Agrupar series por año
  const seriesByYear = useMemo(() => {
    const grouped: Record<number, Series[]> = {};
    filteredSeries.forEach((s) => {
      if (s.published_at) {
        const year = new Date(s.published_at).getFullYear();
        if (!grouped[year]) {
          grouped[year] = [];
        }
        grouped[year].push(s);
      }
    });
    
    // Ordenar años de más reciente a más antiguo
    const sortedYears = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => b - a);
    
    const result: Record<number, Series[]> = {};
    sortedYears.forEach((year) => {
      result[year] = grouped[year];
    });
    
    return result;
  }, [filteredSeries]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getCategoryColor = (categoryName: string | undefined) => {
    if (!categoryName) return 'text-gray-400';
    const name = categoryName.toLowerCase();
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

  const getSeriesType = (videoCount: number) => {
    if (videoCount === 1) return t('rewind.masterclass', 'Masterclass');
    if (videoCount <= 3) return t('rewind.series_short', 'Serie de {count} Cap.', { count: videoCount });
    if (videoCount <= 6) return t('rewind.series_medium', 'Serie de {count} Cap.', { count: videoCount });
    return t('rewind.series_long', 'Serie de {count} Cap.', { count: videoCount });
  };

  const handleSeriesClick = (series: Series) => {
    navigateWithLocale(`/rewind/${series.id}`);
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
              REWIND: <span className="text-gray-500 font-serif italic">{t('rewind.archive', 'El Archivo')}</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-lg font-light max-w-2xl mx-auto leading-relaxed">
              {t('rewind.subtitle', 'Explora la historia del taller año a año. El proceso sin filtros.')}
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
                {t('rewind.all', 'Todos')}
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

      {/* Series Grid by Year */}
      <div className="px-6 md:px-12 pt-12 pb-4 max-w-[1800px] mx-auto">
        {displayYears.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {t('rewind.no_series', 'No hay series disponibles.')}
            </p>
          </div>
        ) : (
          displayYears.map((year) => {
            const yearSeries = seriesByYear[year] || [];
            if (yearSeries.length === 0) return null;

            return (
              <section key={year} className="mb-12">
                <div className="flex items-center gap-3 mb-8 opacity-80 hover:opacity-100 transition-opacity">
                  <ChevronDown className="h-4 w-4 text-[#A05245]" />
                  <h2 className="text-2xl font-serif font-bold text-white tracking-widest border-b border-[#A05245]/30 pb-1 pr-6">
                    {year}
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                  {yearSeries.map((s) => {
                    const thumbnailUrl = getImageUrl(s.cover_image || s.thumbnail || s.image || '');
                    const hasThumbnail = thumbnailUrl && thumbnailUrl !== '';

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSeriesClick(s)}
                        className="group cursor-pointer"
                      >
                        <div className="relative aspect-[9/16] rounded-sm overflow-hidden bg-gray-900 border border-white/10 shadow-2xl transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(160,82,69,0.15)] group-hover:border-[#A05245]/40">
                          {hasThumbnail ? (
                            <img
                              src={thumbnailUrl}
                              alt={s.title || s.name || ''}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-black transition-transform duration-700 group-hover:scale-105"></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>
                          
                          {s.video_count > 0 && (
                            <div className="absolute top-0 right-0 p-3">
                              <span className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 text-[9px] font-bold text-white uppercase tracking-wider">
                                {getSeriesType(s.video_count)}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/20">
                              <Play className="h-6 w-6 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1">
                          <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                            <span>{formatDate(s.published_at)}</span>
                            {s.tags && s.tags.length > 0 && (
                              <span className={getCategoryColor(s.tags[0])}>
                                {s.tags[0]}
                              </span>
                            )}
                          </div>
                          <h3 className="text-white font-display font-medium text-lg leading-tight group-hover:text-[#A05245] transition-colors">
                            {s.title || s.name || ''}
                          </h3>
                          <p className="text-gray-500 text-xs line-clamp-1">
                            {s.short_description || s.description || ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
            {t('rewind.load_older', 'Cargar Años Anteriores')} <History className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>
  );
};

export default Rewind;



