import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { Link } from 'react-router-dom';
import { Globe, ExternalLink } from 'lucide-react';

const CookiePolicy = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();

  return (
    <div className="min-h-screen bg-[#1d1615] text-white font-display antialiased overflow-x-hidden">
      {/* Main Layout */}
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1 justify-center py-10 px-6 md:px-20 lg:px-40">
          <div className="flex flex-col max-w-[840px] flex-1">
            {/* Page Heading */}
            <div className="flex flex-col gap-4 pb-8 border-b border-[#3e302d] mb-8">
              <button
                onClick={() => navigateWithLocale('/')}
                className="mb-4 text-[#a15345] hover:text-[#b56053] transition-colors flex items-center gap-2 text-sm self-start"
              >
                <i className="fa-solid fa-arrow-left"></i>
                {t('common.back', 'Volver')}
              </button>
              <h1 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                {t('cookie_policy.title', 'POLÍTICA DE COOKIES')}
              </h1>
              <p className="text-[#baa4a0] text-lg font-normal leading-relaxed">
                {t('cookie_policy.subtitle', 'Información detallada sobre el uso de cookies en SACRART, su gestión y tus derechos.')}
              </p>
            </div>

            {/* Intro */}
            <div className="mb-10 text-[#baa4a0] text-base leading-7">
              <p className="mb-4">
                {t('cookie_policy.intro.p1', 'En')} <span className="text-white font-medium">www.sacrart.com</span> {t('cookie_policy.intro.p1_cont', '(en adelante, "la Plataforma") utilizamos cookies para permitir el funcionamiento correcto del servicio de streaming, gestionar las sesiones de usuario, facilitar la navegación y analizar cómo los usuarios interactúan con nuestro contenido.')}
              </p>
              <p>
                {t('cookie_policy.intro.p2', 'El objetivo de esta política es informarle de forma clara y detallada sobre qué es una cookie, cuál es su propósito, qué tipo de cookies utilizamos y cómo puede configurarlas o deshabilitarlas.')}
              </p>
            </div>

            {/* Section 1 */}
            <section className="mb-12">
              <h2 className="text-white text-2xl font-bold leading-tight mb-4 flex items-center gap-3">
                <span className="text-[#a15345] font-black text-3xl">1.</span>
                {t('cookie_policy.section1.title', '¿QUÉ SON LAS COOKIES?')}
              </h2>
              <div className="text-[#baa4a0] text-base leading-7 pl-0 md:pl-10">
                <p className="mb-4">
                  {t('cookie_policy.section1.p1', 'Una cookie es un pequeño archivo de texto que se almacena en su navegador cuando visita casi cualquier página web. Su utilidad es que la web sea capaz de recordar su visita cuando vuelva a navegar por esa página. Las cookies suelen almacenar información de carácter técnico, preferencias personales, personalización de contenidos, estadísticas de uso, enlaces a redes sociales, acceso a cuentas de usuario, etc.')}
                </p>
                <div className="bg-[#2a2220] p-6 rounded-xl border border-[#3e302d]">
                  <p className="text-white font-medium mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#a15345]">movie</span>
                    {t('cookie_policy.section1.context_title', 'Contexto SACRART')}
                  </p>
                  <p className="text-sm">
                    {t('cookie_policy.section1.context_desc', 'En una plataforma de streaming como SACRART, las cookies son esenciales para, por ejemplo, recordar que usted ha iniciado sesión y no pedirle la contraseña cada vez que cambia de vídeo, o recordar en qué punto dejó de ver una película para retomarla ahí.')}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section className="mb-12">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="text-[#a15345] font-black text-3xl">2.</span>
                {t('cookie_policy.section2.title', 'TIPOS DE COOKIES UTILIZADAS')}
              </h2>
              <div className="text-[#baa4a0] text-base leading-7 pl-0 md:pl-10 space-y-8">
                {/* Subsection Entity */}
                <div>
                  <h3 className="text-white font-bold text-lg mb-3 border-l-4 border-[#a15345] pl-3">
                    {t('cookie_policy.section2.by_entity', 'Según la entidad que las gestiona')}
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <span className="material-symbols-outlined text-[#a15345] mt-1">domain</span>
                      <div>
                        <strong className="text-white">{t('cookie_policy.section2.own_cookies', 'Cookies propias:')}</strong> {t('cookie_policy.section2.own_cookies_desc', 'Son aquellas que se envían a su equipo desde nuestros propios equipos o dominios y desde el que prestamos el servicio que nos solicita.')}
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="material-symbols-outlined text-[#a15345] mt-1">hub</span>
                      <div>
                        <strong className="text-white">{t('cookie_policy.section2.third_party', 'Cookies de terceros:')}</strong> {t('cookie_policy.section2.third_party_desc', 'Son aquellas que se envían a su equipo desde un equipo o dominio que no es gestionado por nosotros, sino por otra entidad colaboradora (como Google Analytics, YouTube o Stripe).')}
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Subsection Purpose */}
                <div>
                  <h3 className="text-white font-bold text-lg mb-3 border-l-4 border-[#a15345] pl-3">
                    {t('cookie_policy.section2.by_purpose', 'Según su finalidad')}
                  </h3>
                  <ul className="space-y-4">
                    <li className="group">
                      <div className="mb-1 text-white font-bold flex items-center gap-2">
                        <span className="size-2 rounded-full bg-green-500"></span>
                        {t('cookie_policy.section2.technical', 'Cookies técnicas (Necesarias)')}
                      </div>
                      <p className="text-sm pl-4 border-l border-[#3e302d]">
                        {t('cookie_policy.section2.technical_desc', 'Son aquéllas que le permiten la navegación a través de la Plataforma y la utilización de las diferentes opciones o servicios que en ella existan. Por ejemplo, identificar la sesión, acceder a la zona de miembros, recordar elementos de un pedido o seguridad. Sin estas cookies, la Plataforma no puede funcionar correctamente.')}
                      </p>
                    </li>
                    <li className="group">
                      <div className="mb-1 text-white font-bold flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500"></span>
                        {t('cookie_policy.section2.personalization', 'Cookies de personalización')}
                      </div>
                      <p className="text-sm pl-4 border-l border-[#3e302d]">
                        {t('cookie_policy.section2.personalization_desc', 'Permiten al usuario acceder al servicio con características generales predefinidas como el idioma, el volumen del reproductor o el punto de reproducción donde se quedó.')}
                      </p>
                    </li>
                    <li className="group">
                      <div className="mb-1 text-white font-bold flex items-center gap-2">
                        <span className="size-2 rounded-full bg-orange-500"></span>
                        {t('cookie_policy.section2.analytics', 'Cookies de análisis')}
                      </div>
                      <p className="text-sm pl-4 border-l border-[#3e302d]">
                        {t('cookie_policy.section2.analytics_desc', 'Nos permiten cuantificar el número de usuarios y realizar la medición y análisis estadístico de la utilización del servicio para mejorar la oferta de contenidos.')}
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-12">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="text-[#a15345] font-black text-3xl">3.</span>
                {t('cookie_policy.section3.title', 'RELACIÓN DE COOKIES UTILIZADAS')}
              </h2>
              <div className="pl-0 md:pl-10">
                <p className="text-[#baa4a0] mb-4">
                  {t('cookie_policy.section3.intro', 'A continuación, se detallan las cookies que se utilizan en esta Plataforma:')}
                </p>
                <div className="overflow-x-auto rounded-lg border border-[#3e302d] bg-[#2a2220]">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#3e302d] text-white text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold border-b border-[#3e302d]">{t('cookie_policy.table.name', 'Nombre')}</th>
                        <th className="p-4 font-bold border-b border-[#3e302d]">{t('cookie_policy.table.type', 'Tipo')}</th>
                        <th className="p-4 font-bold border-b border-[#3e302d]">{t('cookie_policy.table.provider', 'Proveedor')}</th>
                        <th className="p-4 font-bold border-b border-[#3e302d] w-1/3">{t('cookie_policy.table.purpose', 'Propósito')}</th>
                        <th className="p-4 font-bold border-b border-[#3e302d]">{t('cookie_policy.table.duration', 'Duración')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[#baa4a0] divide-y divide-[#3e302d]">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white">PHPSESSID, auth_token</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                            {t('cookie_policy.table.technical', 'Técnica')}
                          </span>
                        </td>
                        <td className="p-4">SACRART</td>
                        <td className="p-4">{t('cookie_policy.table.session_desc', 'Identificador de sesión. Esencial para mantener al usuario logueado.')}</td>
                        <td className="p-4">{t('cookie_policy.table.session_persistent', 'Sesión / Persistente')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white">player_prefs, volume</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                            {t('cookie_policy.table.personalization', 'Personalización')}
                          </span>
                        </td>
                        <td className="p-4">SACRART / Bunny.net</td>
                        <td className="p-4">{t('cookie_policy.table.player_desc', 'Almacena preferencias del reproductor como volumen o calidad.')}</td>
                        <td className="p-4">{t('cookie_policy.table.persistent', 'Persistente')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white">__stripe_mid, __stripe_sid</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                            {t('cookie_policy.table.security', 'Seguridad')}
                          </span>
                        </td>
                        <td className="p-4">Stripe</td>
                        <td className="p-4">{t('cookie_policy.table.stripe_desc', 'Procesamiento seguro de pagos y prevención de fraude.')}</td>
                        <td className="p-4">{t('cookie_policy.table.year_session', '1 año / Sesión')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white">_ga, _gid, _gat</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-xs">
                            {t('cookie_policy.table.analytics', 'Análisis')}
                          </span>
                        </td>
                        <td className="p-4">Google Analytics</td>
                        <td className="p-4">{t('cookie_policy.table.ga_desc', 'Informes estadísticos anónimos de uso.')}</td>
                        <td className="p-4">{t('cookie_policy.table.ga_duration', '2 años / 24h / 1min')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white">VISITOR_INFO1_LIVE</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs">
                            {t('cookie_policy.table.functional', 'Funcional')}
                          </span>
                        </td>
                        <td className="p-4">YouTube</td>
                        <td className="p-4">{t('cookie_policy.table.youtube_desc', 'Rastreo de vistas de videos incrustados y ancho de banda.')}</td>
                        <td className="p-4">{t('cookie_policy.table.youtube_duration', 'Sesión a 2 años')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white">__cfduid, b-cdn</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                            {t('cookie_policy.table.technical', 'Técnica')}
                          </span>
                        </td>
                        <td className="p-4">Bunny.net / Cloudflare</td>
                        <td className="p-4">{t('cookie_policy.table.cdn_desc', 'Optimización de CDN y seguridad de entrega de video.')}</td>
                        <td className="p-4">{t('cookie_policy.table.cdn_duration', '~1 año')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[#baa4a0]/60 mt-3 italic">
                  {t('cookie_policy.section3.note', 'Nota: Esta lista es meramente informativa y puede variar en función de las actualizaciones de las herramientas de terceros.')}
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section className="mb-12">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="text-[#a15345] font-black text-3xl">4.</span>
                {t('cookie_policy.section4.title', 'ACEPTACIÓN, RECHAZO O CONFIGURACIÓN')}
              </h2>
              <div className="text-[#baa4a0] text-base leading-7 pl-0 md:pl-10">
                <p className="mb-4">
                  {t('cookie_policy.section4.p1', 'Al acceder por primera vez a la Plataforma, se le muestra un aviso de cookies donde se le informa de cómo puede prestar o rechazar su consentimiento.')}
                </p>
                <p className="mb-6">
                  {t('cookie_policy.section4.p2', 'Puede usted permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones del navegador instalado en su ordenador.')}
                  <span className="text-orange-400"> {t('cookie_policy.section4.warning', 'Atención:')}</span> {t('cookie_policy.section4.p2_cont', 'si desactiva las cookies técnicas necesarias, es posible que no pueda acceder a la zona de miembros ni ver los contenidos correctamente.')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    className="flex items-center gap-3 p-4 rounded-lg bg-[#2a2220] border border-[#3e302d] hover:border-[#a15345] group transition-all"
                    href="https://support.google.com/chrome/answer/95647?hl=es"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#a15345]/20">
                      <Globe className="text-[#a15345] text-2xl" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{t('cookie_policy.browsers.chrome', 'Google Chrome')}</div>
                      <div className="text-xs text-[#a15345] group-hover:underline">{t('cookie_policy.browsers.view_support', 'Ver soporte')}</div>
                    </div>
                    <ExternalLink className="text-[#baa4a0] ml-auto group-hover:text-[#a15345] w-5 h-5" />
                  </a>
                  <a
                    className="flex items-center gap-3 p-4 rounded-lg bg-[#2a2220] border border-[#3e302d] hover:border-[#a15345] group transition-all"
                    href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#a15345]/20">
                      <Globe className="text-[#a15345] text-2xl" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{t('cookie_policy.browsers.firefox', 'Mozilla Firefox')}</div>
                      <div className="text-xs text-[#a15345] group-hover:underline">{t('cookie_policy.browsers.view_support', 'Ver soporte')}</div>
                    </div>
                    <ExternalLink className="text-[#baa4a0] ml-auto group-hover:text-[#a15345] w-5 h-5" />
                  </a>
                  <a
                    className="flex items-center gap-3 p-4 rounded-lg bg-[#2a2220] border border-[#3e302d] hover:border-[#a15345] group transition-all"
                    href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#a15345]/20">
                      <Globe className="text-[#a15345] text-2xl" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{t('cookie_policy.browsers.safari', 'Safari')}</div>
                      <div className="text-xs text-[#a15345] group-hover:underline">{t('cookie_policy.browsers.view_support', 'Ver soporte')}</div>
                    </div>
                    <ExternalLink className="text-[#baa4a0] ml-auto group-hover:text-[#a15345] w-5 h-5" />
                  </a>
                  <a
                    className="flex items-center gap-3 p-4 rounded-lg bg-[#2a2220] border border-[#3e302d] hover:border-[#a15345] group transition-all"
                    href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#a15345]/20">
                      <Globe className="text-[#a15345] text-2xl" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{t('cookie_policy.browsers.edge', 'Microsoft Edge')}</div>
                      <div className="text-xs text-[#a15345] group-hover:underline">{t('cookie_policy.browsers.view_support', 'Ver soporte')}</div>
                    </div>
                    <ExternalLink className="text-[#baa4a0] ml-auto group-hover:text-[#a15345] w-5 h-5" />
                  </a>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="mb-12">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="text-[#a15345] font-black text-3xl">5.</span>
                {t('cookie_policy.section5.title', 'ACTUALIZACIÓN DE LA POLÍTICA')}
              </h2>
              <div className="text-[#baa4a0] text-base leading-7 pl-0 md:pl-10">
                <p>
                  {t('cookie_policy.section5.p1', 'Es posible que actualicemos la Política de Cookies de nuestra Plataforma, por ello le recomendamos revisar esta política cada vez que acceda a nuestro sitio web con el objetivo de estar adecuadamente informado sobre cómo y para qué usamos las cookies.')}
                </p>
              </div>
            </section>

            <div className="w-full h-px bg-[#3e302d] my-10"></div>
            <p className="text-center text-[#baa4a0] text-sm">
              {t('cookie_policy.last_update', 'Última actualización:')} {t('cookie_policy.last_update_date', 'Noviembre 2023')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
