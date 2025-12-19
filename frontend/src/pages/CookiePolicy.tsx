import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { Card } from '@/components/ui/card';

const CookiePolicy = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();

  return (
    <div className="min-h-screen bg-background-dark text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigateWithLocale('/')}
          className="mb-8 text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
        >
          <i className="fa-solid fa-arrow-left"></i>
          {t('common.back', 'Volver')}
        </button>

        <Card className="p-6 sm:p-8 lg:p-12 bg-surface-dark border-border-dark">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            {t('cookie_policy.title', 'Política de Cookies')}
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                {t('cookie_policy.what_are_cookies', '¿Qué son las cookies?')}
              </h2>
              <p className="text-base leading-relaxed">
                {t('cookie_policy.what_are_cookies_desc', 
                  'Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Estas cookies nos ayudan a proporcionar, proteger y mejorar nuestros servicios, personalizar contenido y anuncios, y analizar el tráfico del sitio.'
                )}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                {t('cookie_policy.how_we_use', '¿Cómo utilizamos las cookies?')}
              </h2>
              <p className="text-base leading-relaxed mb-4">
                {t('cookie_policy.how_we_use_desc',
                  'Utilizamos cookies para diversos fines, incluyendo:'
                )}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>{t('cookie_policy.use_1', 'Proporcionar y mantener nuestros servicios')}</li>
                <li>{t('cookie_policy.use_2', 'Analizar cómo los usuarios utilizan nuestro sitio web')}</li>
                <li>{t('cookie_policy.use_3', 'Personalizar contenido y experiencias')}</li>
                <li>{t('cookie_policy.use_4', 'Mejorar la funcionalidad y el rendimiento')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                {t('cookie_policy.types', 'Tipos de cookies que utilizamos')}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {t('cookie_policy.necessary', 'Cookies Necesarias')}
                  </h3>
                  <p className="text-base leading-relaxed">
                    {t('cookie_policy.necessary_desc',
                      'Estas cookies son esenciales para el funcionamiento del sitio web y no se pueden desactivar. Incluyen cookies de sesión, autenticación y seguridad.'
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {t('cookie_policy.analytics', 'Cookies de Análisis')}
                  </h3>
                  <p className="text-base leading-relaxed">
                    {t('cookie_policy.analytics_desc',
                      'Utilizamos Google Analytics para entender cómo los visitantes interactúan con nuestro sitio web. Estas cookies recopilan información de forma anónima sobre el uso del sitio.'
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {t('cookie_policy.marketing', 'Cookies de Marketing')}
                  </h3>
                  <p className="text-base leading-relaxed">
                    {t('cookie_policy.marketing_desc',
                      'Estas cookies se utilizan para mostrar anuncios relevantes y medir la efectividad de nuestras campañas publicitarias.'
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {t('cookie_policy.youtube', 'Cookies de YouTube')}
                  </h3>
                  <p className="text-base leading-relaxed">
                    {t('cookie_policy.youtube_desc',
                      'Cuando reproducimos videos de YouTube en nuestro sitio, YouTube puede establecer cookies para rastrear la visualización y personalizar la experiencia.'
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                {t('cookie_policy.manage', 'Gestionar sus preferencias de cookies')}
              </h2>
              <p className="text-base leading-relaxed mb-4">
                {t('cookie_policy.manage_desc',
                  'Puede gestionar sus preferencias de cookies en cualquier momento haciendo clic en el botón "Configurar" en el banner de cookies o visitando la configuración de cookies en su navegador.'
                )}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                {t('cookie_policy.contact', 'Contacto')}
              </h2>
              <p className="text-base leading-relaxed">
                {t('cookie_policy.contact_desc',
                  'Si tiene preguntas sobre nuestra política de cookies, puede contactarnos a través de nuestra página de soporte.'
                )}
              </p>
            </section>

            <section>
              <p className="text-sm text-gray-400 mt-8">
                {t('cookie_policy.last_updated', 'Última actualización:')} {new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CookiePolicy;
