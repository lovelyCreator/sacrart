import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    functional: false,
  });

  // Check if user has already made a choice
  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner if no consent has been given
      setShowBanner(true);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent);
        setPreferences({
          necessary: true,
          analytics: saved.analytics || false,
          marketing: saved.marketing || false,
          functional: saved.functional || false,
        });
      } catch (e) {
        console.error('Error parsing cookie consent:', e);
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsent = (analytics: boolean, marketing: boolean, functional: boolean) => {
    const consent = {
      necessary: true,
      analytics,
      marketing,
      functional,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setPreferences({
      necessary: true,
      analytics,
      marketing,
      functional,
    });
    setShowBanner(false);
    setShowPreferences(false);
    
    // Trigger custom event for other components to listen
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
  };

  const handleAcceptAll = () => {
    saveConsent(true, true, true);
  };

  const handleRejectAll = () => {
    saveConsent(false, false, false);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences.analytics, preferences.marketing, preferences.functional);
  };

  const handleShowPreferences = () => {
    setShowPreferences(true);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={() => {
          // Don't close on backdrop click - user must make a choice
        }}
      />

      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto bg-surface-dark border border-border-dark rounded-lg shadow-2xl p-6 sm:p-8">
          {!showPreferences ? (
            // Main Banner View
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t('cookie_banner.title', 'Política de Cookies')}
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base mb-4">
                    {t('cookie_banner.description', 
                      'Utilizamos cookies para mejorar su experiencia, analizar el tráfico del sitio y personalizar el contenido. Al hacer clic en "Aceptar todo", acepta el uso de todas las cookies. También puede gestionar sus preferencias individuales.'
                    )}
                  </p>
                  <a
                    href="/politica-de-cookies"
                    className="text-primary hover:text-primary/80 text-sm underline"
                  >
                    {t('cookie_banner.learn_more', 'Más información sobre cookies')}
                  </a>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="ml-4 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                  className="flex-1 sm:flex-none bg-transparent border-gray-600 text-white hover:bg-gray-800"
                >
                  {t('cookie_banner.reject_all', 'Rechazar todo')}
                </Button>
                <Button
                  onClick={handleShowPreferences}
                  variant="outline"
                  className="flex-1 sm:flex-none bg-transparent border-gray-600 text-white hover:bg-gray-800"
                >
                  {t('cookie_banner.configure', 'Configurar')}
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white"
                >
                  {t('cookie_banner.accept_all', 'Aceptar todo')}
                </Button>
              </div>
            </>
          ) : (
            // Preferences View
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t('cookie_banner.preferences_title', 'Preferencias de Cookies')}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {t('cookie_banner.preferences_desc', 'Seleccione qué tipos de cookies desea permitir.')}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="ml-4 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Necessary Cookies - Always enabled */}
                <div className="flex items-start justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {t('cookie_banner.necessary_title', 'Cookies Necesarias')}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {t('cookie_banner.necessary_desc', 
                        'Estas cookies son esenciales para el funcionamiento del sitio web y no se pueden desactivar.'
                      )}
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-6 bg-primary rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {t('cookie_banner.analytics_title', 'Cookies de Análisis')}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {t('cookie_banner.analytics_desc', 
                        'Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web.'
                      )}
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences(prev => ({ ...prev, analytics: !prev.analytics }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        preferences.analytics ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {t('cookie_banner.marketing_title', 'Cookies de Marketing')}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {t('cookie_banner.marketing_desc', 
                        'Se utilizan para mostrar anuncios relevantes y medir la efectividad de nuestras campañas.'
                      )}
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences(prev => ({ ...prev, marketing: !prev.marketing }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        preferences.marketing ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.marketing ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {t('cookie_banner.functional_title', 'Cookies Funcionales')}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {t('cookie_banner.functional_desc', 
                        'Permiten recordar sus preferencias y mejorar su experiencia.'
                      )}
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => setPreferences(prev => ({ ...prev, functional: !prev.functional }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        preferences.functional ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.functional ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={() => setShowPreferences(false)}
                  variant="outline"
                  className="flex-1 sm:flex-none bg-transparent border-gray-600 text-white hover:bg-gray-800"
                >
                  {t('cookie_banner.cancel', 'Cancelar')}
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white"
                >
                  {t('cookie_banner.save_preferences', 'Guardar Preferencias')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CookieConsentBanner;

