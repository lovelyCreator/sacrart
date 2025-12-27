<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingsSeeder extends Seeder
{
    public function run(): void
    {
        // Hero Section Settings
        SiteSetting::setValue(
            'hero_title',
            'Sculpting Mastery',
            'text',
            'hero',
            'Hero Title',
            'Main title displayed in the hero section'
        );

        SiteSetting::setValue(
            'hero_subtitle',
            'Witness the artistry behind incredible sculpting techniques and restoration processes',
            'text',
            'hero',
            'Hero Subtitle',
            'Subtitle displayed below the main title'
        );

        SiteSetting::setValue(
            'hero_cta_text',
            'Start enjoying SACRART plans from only',
            'text',
            'hero',
            'CTA Text',
            'Call-to-action text above the price'
        );

        SiteSetting::setValue(
            'hero_price',
            '€9.99/month',
            'text',
            'hero',
            'Hero Price',
            'Price displayed in the hero section'
        );

        SiteSetting::setValue(
            'hero_cta_button_text',
            'GET SACRART',
            'text',
            'hero',
            'CTA Button Text',
            'Text displayed on the main call-to-action button'
        );

        SiteSetting::setValue(
            'hero_disclaimer',
            '*Requires subscription and the Premium add-on (its availability varies depending on the subscription provider). Automatic renewal unless canceled. Subject to Terms and Conditions. Content availability varies by plan. +18.',
            'text',
            'hero',
            'Hero Disclaimer',
            'Disclaimer text displayed below the CTA button'
        );

        // General Site Settings
        SiteSetting::setValue(
            'site_name',
            'SACRART',
            'text',
            'general',
            'Site Name',
            'The name of the website'
        );

        SiteSetting::setValue(
            'site_tagline',
            'Learn the art of sculpting',
            'text',
            'general',
            'Site Tagline',
            'Short tagline for the website'
        );

        SiteSetting::setValue(
            'contact_email',
            'support@sacrart.com',
            'text',
            'general',
            'Contact Email',
            'Main contact email address'
        );

        SiteSetting::setValue(
            'contact_phone',
            '+1 (555) 123-4567',
            'text',
            'general',
            'Contact Phone',
            'Main contact phone number'
        );

        // Footer Settings
        SiteSetting::setValue(
            'footer_copyright',
            '© 2024 SACRART. All rights reserved.',
            'text',
            'footer',
            'Copyright Text',
            'Copyright text displayed in the footer'
        );

        SiteSetting::setValue(
            'footer_description',
            'Master the art of sculpting with our comprehensive online courses and expert guidance.',
            'text',
            'footer',
            'Footer Description',
            'Description text displayed in the footer'
        );

        // Why SACRART Section Settings
        SiteSetting::setValue(
            'why_sacrart_title',
            '¿Por qué SACRART?',
            'text',
            'why_sacrart',
            'Why SACRART Title',
            'Main title for the Why SACRART section',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_title',
            '¿Por qué SACRART?',
            'text',
            'why_sacrart',
            'Why SACRART Title',
            'Main title for the Why SACRART section',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_title',
            'Por que SACRART?',
            'text',
            'why_sacrart',
            'Why SACRART Title',
            'Main title for the Why SACRART section',
            'pt'
        );

        SiteSetting::setValue(
            'why_sacrart_description',
            'Immerse yourself in the ancestral knowledge of sacred art from any device.',
            'text',
            'why_sacrart',
            'Why SACRART Description',
            'Description text for the Why SACRART section',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_description',
            'Sumérgete en el conocimiento ancestral del arte sacro desde cualquier dispositivo.',
            'text',
            'why_sacrart',
            'Why SACRART Description',
            'Description text for the Why SACRART section',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_description',
            'Mergulhe no conhecimento ancestral da arte sacra de qualquer dispositivo.',
            'text',
            'why_sacrart',
            'Why SACRART Description',
            'Description text for the Why SACRART section',
            'pt'
        );

        // Artist Card
        SiteSetting::setValue(
            'why_sacrart_artist_title',
            'For the Artist or Apprentice',
            'text',
            'why_sacrart',
            'Artist Card Title',
            'Title for the artist/apprentice card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_artist_title',
            'Para el Artista o Aprendiz',
            'text',
            'why_sacrart',
            'Artist Card Title',
            'Title for the artist/apprentice card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_artist_title',
            'Para o Artista ou Aprendiz',
            'text',
            'why_sacrart',
            'Artist Card Title',
            'Title for the artist/apprentice card',
            'pt'
        );

        SiteSetting::setValue(
            'why_sacrart_artist_description',
            'Who seeks to perfect their technique, learn traditional and modern methods, and find inspiration in an artist who opens the doors of her workshop.',
            'text',
            'why_sacrart',
            'Artist Card Description',
            'Description for the artist/apprentice card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_artist_description',
            'Que busca perfeccionar su técnica, aprender métodos tradicionales y modernos y encontrar inspiración en una artista que abre las puertas de su taller.',
            'text',
            'why_sacrart',
            'Artist Card Description',
            'Description for the artist/apprentice card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_artist_description',
            'Que busca aperfeiçoar sua técnica, aprender métodos tradicionais e modernos e encontrar inspiração em uma artista que abre as portas de seu ateliê.',
            'text',
            'why_sacrart',
            'Artist Card Description',
            'Description for the artist/apprentice card',
            'pt'
        );

        // Art Lover Card
        SiteSetting::setValue(
            'why_sacrart_art_lover_title',
            'For the Art Enthusiast',
            'text',
            'why_sacrart',
            'Art Lover Card Title',
            'Title for the art lover card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_art_lover_title',
            'Para el Apasionado del Arte',
            'text',
            'why_sacrart',
            'Art Lover Card Title',
            'Title for the art lover card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_art_lover_title',
            'Para o Apaixonado pela Arte',
            'text',
            'why_sacrart',
            'Art Lover Card Title',
            'Title for the art lover card',
            'pt'
        );

        SiteSetting::setValue(
            'why_sacrart_art_lover_description',
            'Who enjoys watching an image being born and grow, without needing to practice: just curiosity and excitement for the process.',
            'text',
            'why_sacrart',
            'Art Lover Card Description',
            'Description for the art lover card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_art_lover_description',
            'Que disfruta viendo nacer y crecer una imagen, sin necesidad de practicar: solo curiosidad y emoción por el proceso.',
            'text',
            'why_sacrart',
            'Art Lover Card Description',
            'Description for the art lover card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_art_lover_description',
            'Que gosta de ver uma imagem nascer e crescer, sem necessidade de praticar: apenas curiosidade e emoção pelo processo.',
            'text',
            'why_sacrart',
            'Art Lover Card Description',
            'Description for the art lover card',
            'pt'
        );

        // Quality Feature
        SiteSetting::setValue(
            'why_sacrart_quality_title',
            '4K HDR Quality',
            'text',
            'why_sacrart',
            'Quality Feature Title',
            'Title for the quality feature card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_quality_title',
            'Calidad 4K HDR',
            'text',
            'why_sacrart',
            'Quality Feature Title',
            'Title for the quality feature card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_quality_title',
            'Qualidade 4K HDR',
            'text',
            'why_sacrart',
            'Quality Feature Title',
            'Title for the quality feature card',
            'pt'
        );

        SiteSetting::setValue(
            'why_sacrart_quality_description',
            'Don\'t miss a single brushstroke detail.',
            'text',
            'why_sacrart',
            'Quality Feature Description',
            'Description for the quality feature card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_quality_description',
            'No pierdas detalle de cada pincelada.',
            'text',
            'why_sacrart',
            'Quality Feature Description',
            'Description for the quality feature card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_quality_description',
            'Não perca nenhum detalhe de cada pincelada.',
            'text',
            'why_sacrart',
            'Quality Feature Description',
            'Description for the quality feature card',
            'pt'
        );

        // Multilanguage Feature
        SiteSetting::setValue(
            'why_sacrart_multilang_title',
            'Multilanguage',
            'text',
            'why_sacrart',
            'Multilanguage Feature Title',
            'Title for the multilanguage feature card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_multilang_title',
            'Multilenguaje',
            'text',
            'why_sacrart',
            'Multilanguage Feature Title',
            'Title for the multilanguage feature card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_multilang_title',
            'Multilíngue',
            'text',
            'why_sacrart',
            'Multilanguage Feature Title',
            'Title for the multilanguage feature card',
            'pt'
        );

        SiteSetting::setValue(
            'why_sacrart_multilang_description',
            'Dubbed and subtitled in English and Portuguese.',
            'text',
            'why_sacrart',
            'Multilanguage Feature Description',
            'Description for the multilanguage feature card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_multilang_description',
            'Doblados y subtitulados al inglés y portugués.',
            'text',
            'why_sacrart',
            'Multilanguage Feature Description',
            'Description for the multilanguage feature card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_multilang_description',
            'Dublados e legendados em inglês e português.',
            'text',
            'why_sacrart',
            'Multilanguage Feature Description',
            'Description for the multilanguage feature card',
            'pt'
        );

        // Platform Feature
        SiteSetting::setValue(
            'why_sacrart_platform_title',
            'Multiplatform',
            'text',
            'why_sacrart',
            'Platform Feature Title',
            'Title for the platform feature card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_platform_title',
            'Multiplataforma',
            'text',
            'why_sacrart',
            'Platform Feature Title',
            'Title for the platform feature card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_platform_title',
            'Multiplataforma',
            'text',
            'why_sacrart',
            'Platform Feature Title',
            'Title for the platform feature card',
            'pt'
        );

        SiteSetting::setValue(
            'why_sacrart_platform_description',
            'Web, tablet and mobile.',
            'text',
            'why_sacrart',
            'Platform Feature Description',
            'Description for the platform feature card',
            'en'
        );
        SiteSetting::setValue(
            'why_sacrart_platform_description',
            'Web, tablet y móvil.',
            'text',
            'why_sacrart',
            'Platform Feature Description',
            'Description for the platform feature card',
            'es'
        );
        SiteSetting::setValue(
            'why_sacrart_platform_description',
            'Web, tablet e celular.',
            'text',
            'why_sacrart',
            'Platform Feature Description',
            'Description for the platform feature card',
            'pt'
        );
    }
}