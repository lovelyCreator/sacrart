import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { settingsApi } from "@/services/settingsApi";
import { Instagram, Facebook, Youtube } from "lucide-react";
import logoImage from "@/assets/logo-transparente.png";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { getPathWithLocale, locale } = useLocale();
  const [footerSettings, setFooterSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Fetch footer settings from backend
  useEffect(() => {
    const fetchFooterSettings = async () => {
      try {
        const response = await settingsApi.getPublicSettings();
        if (response.success && response.data) {
          setFooterSettings(response.data);
        }
      } catch (error) {
        console.error('Error fetching footer settings:', error);
      }
    };
    fetchFooterSettings();
  }, [locale]);

  // Background image URL from code.html
  const backgroundImageUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBm63qfwZjoifAB45sz8oMo-JgC8P41pRpz2njY6TiYfWhJW1SixA4mx3aWbXXFneVUK9zlGVGLOuFlcGncZ8UxnEqMp_72ACxQdMM6sxH2-56Do-qy17FyICgJbU5cfkKPWuiTlaoJNcXu2U5n_oWfo1nNhannTLmdU3kXiY_MiovAPobO-VsnOOGgTd1TQtfkfT8cG0H-DFnxa_8GPitq2ffd713PYMxyANYdQSHBMYod-8MWU4c8SbmsV_Rh94oyqhUWK6xwi7M";

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
    <main className="flex-grow w-full relative flex flex-col items-center justify-center min-h-[80vh] bg-[#0A0A0A]">
      {/* Background with image and overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          alt="Taller de arte oscuro" 
          className="w-full h-full object-cover opacity-20 filter sepia-[0.3] contrast-125" 
          src={backgroundImageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#A05245]/5 via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center flex flex-col items-center justify-center">
        {/* 404 Number */}
        <div className="mb-2 select-none relative">
          <h1 className="text-[120px] sm:text-[160px] md:text-[220px] font-serif font-bold leading-none wood-gold-text drop-shadow-2xl">
            404
          </h1>
          <div 
            aria-hidden="true" 
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent bg-clip-text text-transparent pointer-events-none"
          >
            404
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-display text-white mb-6 tracking-wide drop-shadow-lg">
          {t('notFound.title', 'Esta obra aún no está terminada.')}
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-sm md:text-base font-light max-w-lg mx-auto mb-12 leading-relaxed tracking-wide">
          {t('notFound.description', 'Parece que la página que buscas no existe, se ha movido o todavía está en el taller de nuestros maestros.')}
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-8">
          <Link
            to={getPathWithLocale('/')}
            className="px-10 py-4 bg-[#A05245] hover:bg-[#8e493e] text-white text-xs font-bold uppercase tracking-[0.2em] rounded transition-all shadow-[0_4px_14px_rgba(160,82,69,0.3)] hover:shadow-[0_6px_20px_rgba(160,82,69,0.4)] hover:-translate-y-0.5 border border-white/5"
          >
            {t('notFound.backHome', 'VOLVER AL INICIO')}
          </Link>
          
          <Link
            to={getPathWithLocale('/support')}
            className="group flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors duration-300"
          >
            <span className="text-xs tracking-widest uppercase">
              {t('notFound.needHelp', '¿Necesitas ayuda?')}
            </span>
            <span className="text-xs font-medium border-b border-gray-700 group-hover:border-[#A05245] transition-colors pb-0.5">
              {t('notFound.contactSupport', 'Contacta con Soporte')}
            </span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white pt-16 pb-8 border-t border-white/5 z-10 mt-auto w-full">
        <div className="max-w-[1800px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center mb-6">
                <span className="text-black font-serif font-bold text-xl">S</span>
              </div>
              <p className="text-[#b2a6a4] text-xs leading-relaxed max-w-[250px]">
                {footerSettings.footer_description || t('footer.description', 'La primera plataforma de streaming dedicada exclusivamente a la enseñanza y difusión del arte sacro.')}
              </p>
              <div className="flex gap-4 mt-4">
                {footerSettings.footer_social_instagram && footerSettings.footer_social_instagram !== 'https://' && (
                  <a 
                    href={footerSettings.footer_social_instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <span className="material-icons text-lg">photo_camera</span>
                  </a>
                )}
                {footerSettings.footer_social_facebook && footerSettings.footer_social_facebook !== 'https://' && (
                  <a 
                    href={footerSettings.footer_social_facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <span className="material-icons text-lg">public</span>
                  </a>
                )}
                {footerSettings.footer_social_youtube && footerSettings.footer_social_youtube !== 'https://' && (
                  <a 
                    href={footerSettings.footer_social_youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="YouTube"
                  >
                    <span className="material-icons text-lg">play_arrow</span>
                  </a>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">{t('footer.explore', 'Explorar')}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link to={getPathWithLocale("/browse")} className="hover:text-primary transition-colors">{t('footer.modeling', 'Modelado')}</Link></li>
                <li><Link to={getPathWithLocale("/browse")} className="hover:text-primary transition-colors">{t('footer.carving', 'Talla')}</Link></li>
                <li><Link to={getPathWithLocale("/browse")} className="hover:text-primary transition-colors">{t('footer.polychromy', 'Policromía')}</Link></li>
                <li><Link to={getPathWithLocale("/browse")} className="hover:text-primary transition-colors">{t('footer.materials', 'Materiales')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">{t('footer.account', 'Cuenta')}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link to={getPathWithLocale("/profile")} className="hover:text-primary transition-colors">{t('footer.my_profile', 'Mi Perfil')}</Link></li>
                <li><Link to={getPathWithLocale("/library")} className="hover:text-primary transition-colors">{t('footer.my_list', 'Mi Lista')}</Link></li>
                <li><Link to={getPathWithLocale("/profile")} className="hover:text-primary transition-colors">{t('footer.certificates', 'Certificados')}</Link></li>
                <li><Link to={getPathWithLocale("/subscription")} className="hover:text-primary transition-colors">{t('footer.subscription', 'Suscripción')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">{t('footer.help', 'Ayuda')}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link to={getPathWithLocale("/support")} className="hover:text-primary transition-colors">{t('footer.support', 'Soporte')}</Link></li>
                <li><Link to={getPathWithLocale("/support")} className="hover:text-primary transition-colors">{t('footer.faq', 'Preguntas Frecuentes')}</Link></li>
                <li><Link to={getPathWithLocale("/support")} className="hover:text-primary transition-colors">{t('footer.contact', 'Contacto')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">{t('footer.legal', 'Legal')}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link to={getPathWithLocale("/aviso-legal")} className="hover:text-primary transition-colors">{t('footer.legal_notice', 'Aviso Legal')}</Link></li>
                <li><Link to={getPathWithLocale("/terminos-y-condiciones")} className="hover:text-primary transition-colors">{t('footer.terms', 'Términos')}</Link></li>
                <li><Link to={getPathWithLocale("/politica-de-privacidad")} className="hover:text-primary transition-colors">{t('footer.privacy', 'Privacidad')}</Link></li>
                <li><Link to={getPathWithLocale("/politica-de-cookies")} className="hover:text-primary transition-colors">{t('footer.cookies', 'Cookies')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              {footerSettings.footer_social_instagram && footerSettings.footer_social_instagram !== 'https://' && (
                <a 
                  href={footerSettings.footer_social_instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <span className="material-icons text-lg">photo_camera</span>
                </a>
              )}
              {footerSettings.footer_social_facebook && footerSettings.footer_social_facebook !== 'https://' && (
                <a 
                  href={footerSettings.footer_social_facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <span className="material-icons text-lg">public</span>
                </a>
              )}
              {footerSettings.footer_social_youtube && footerSettings.footer_social_youtube !== 'https://' && (
                <a 
                  href={footerSettings.footer_social_youtube} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="YouTube"
                >
                  <span className="material-icons text-lg">play_arrow</span>
                </a>
              )}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              {footerSettings.footer_copyright || `© ${new Date().getFullYear()} SACRART. ${t('footer.all_rights_reserved', 'Todos los derechos reservados.')}`}
            </div>
          </div>
        </div>
      </footer>
    </main>
    </div>
  );
};

export default NotFound;
