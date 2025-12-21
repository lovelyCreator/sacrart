import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [activeSection, setActiveSection] = useState('section-1');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'section-1',
        'section-2',
        'section-3',
        'section-4',
        'section-5',
        'section-6',
        'section-7',
        'section-8'
      ];

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#1d1615] text-white font-display overflow-x-hidden flex flex-col">
      {/* Main Layout */}
      <div className="flex-1 flex justify-center py-10 px-4 md:px-10 lg:px-20">
        <div className="w-full max-w-7xl flex gap-10 relative">
          {/* Sidebar (Sticky Table of Contents) */}
          <aside className="hidden lg:block w-72 flex-shrink-0 self-start">
            <div className="sticky top-28 bg-[#1e1715] p-4 rounded-xl border border-[#3e302d] max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h1 className="text-white text-lg font-bold leading-normal mb-6 border-b border-[#3e302d] pb-2">
                {t('privacy.index', 'Índice')}
              </h1>
              <nav className="flex flex-col gap-2">
                <a
                  onClick={() => scrollToSection('section-1')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-1' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">01</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-1' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section1.title', 'Responsable')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-2')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-2' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">02</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-2' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section2.title', 'Finalidad')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-3')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-3' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">03</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-3' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section3.title', 'Conservación')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-4')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-4' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">04</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-4' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section4.title', 'Destinatarios')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-5')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-5' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">05</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-5' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section5.title', 'Derechos')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-6')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-6' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">06</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-6' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section6.title', 'Menores')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-7')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-7' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">07</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-7' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section7.title', 'Veracidad')}
                  </span>
                </a>
                <a
                  onClick={() => scrollToSection('section-8')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    activeSection === 'section-8' ? 'bg-[#3e302d]' : 'hover:bg-[#3e302d]'
                  }`}
                >
                  <span className="text-[#a15345] text-xs font-bold">08</span>
                  <span className={`text-sm font-medium leading-normal ${
                    activeSection === 'section-8' ? 'text-white' : 'text-[#baa4a0] group-hover:text-white'
                  }`}>
                    {t('privacy.section8.title', 'Seguridad')}
                  </span>
                </a>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 max-w-[860px]">
            {/* Page Title */}
            <div className="mb-10 border-l-4 border-[#a15345] pl-6">
              <button
                onClick={() => navigateWithLocale('/')}
                className="mb-4 text-[#a15345] hover:text-[#b56053] transition-colors flex items-center gap-2 text-sm self-start"
              >
                <i className="fa-solid fa-arrow-left"></i>
                {t('common.back', 'Volver')}
              </button>
              <p className="text-white text-4xl md:text-5xl font-black leading-tight tracking-tight mb-2">
                {t('privacy.title', 'POLÍTICA DE PRIVACIDAD')}
              </p>
              <p className="text-[#baa4a0] text-base font-normal">
                {t('privacy.last_update', 'Última actualización:')} {t('privacy.last_update_date', 'Octubre 2023')}
              </p>
            </div>

            {/* Intro */}
            <div className="bg-[#3e302d]/30 rounded-xl p-6 mb-8 border border-[#3e302d]">
              <p className="text-gray-300 text-lg leading-relaxed">
                {t('privacy.intro.p1', 'La presente Política de Privacidad establece los términos en que')} <span className="text-[#a15345] font-medium">www.sacrart.com</span> {t('privacy.intro.p1_cont', 'usa y protege la información que es proporcionada por sus usuarios al momento de utilizar su sitio web. Esta compañía está comprometida con la seguridad de los datos de sus usuarios.')}
              </p>
              <p className="text-gray-300 text-base leading-relaxed mt-4">
                {t('privacy.intro.p2', 'Esta Política de Privacidad puede cambiar con el tiempo o ser actualizada, por lo que le recomendamos y enfatizamos revisar continuamente esta página para asegurarse de que está de acuerdo con dichos cambios.')}
              </p>
            </div>

            {/* Section 1 */}
            <section className="mb-12" id="section-1">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">1</span>
                {t('privacy.section1.title_full', 'RESPONSABLE DEL TRATAMIENTO DE DATOS')}
              </h2>
              <div className="text-gray-300 space-y-4 leading-relaxed">
                <p className="italic text-[#baa4a0]">
                  {t('privacy.section1.question', '¿Quién es el responsable del tratamiento de sus datos personales?')}
                </p>
                <div className="bg-[#3e302d]/20 p-5 rounded-lg border border-[#3e302d]/50">
                  <ul className="space-y-2">
                    <li>
                      <strong className="text-white">{t('privacy.section1.identity', 'Identidad del Responsable:')}</strong> {t('privacy.section1.identity_desc', 'Ana Rey Martínez (en adelante, "la PROPIETARIA" o "SACRART").')}
                    </li>
                    <li>
                      <strong className="text-white">{t('privacy.section1.nif', 'N.I.F.:')}</strong> 75768495D
                    </li>
                    <li>
                      <strong className="text-white">{t('privacy.section1.address', 'Dirección postal:')}</strong> {t('privacy.section1.address_desc', 'Ctra. Marquesado C/Gaviota 11138 Puerto Real (Cádiz)')}
                    </li>
                    <li>
                      <strong className="text-white">{t('privacy.section1.email', 'Correo electrónico:')}</strong> <a className="text-[#a15345] hover:underline" href="mailto:anarey@sacrart.com">anarey@sacrart.com</a>
                    </li>
                    <li>
                      <strong className="text-white">{t('privacy.section1.activity', 'Actividad:')}</strong> {t('privacy.section1.activity_desc', 'Plataforma de membresía, venta de productos/servicios y creación de contenido.')}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section className="mb-12" id="section-2">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">2</span>
                {t('privacy.section2.title_full', 'FINALIDAD Y LEGITIMACIÓN DEL TRATAMIENTO')}
              </h2>
              <div className="text-gray-300 space-y-6 leading-relaxed">
                <p>{t('privacy.section2.question', '¿Para qué utilizamos sus datos personales y por qué es legal hacerlo?')}</p>
                <p>{t('privacy.section2.intro', 'En SACRART tratamos la información que nos facilitan las personas interesadas con las siguientes finalidades, dependiendo de cómo interactúe con la web:')}</p>
                
                {/* Subsection A */}
                <div className="pl-4 border-l-2 border-[#3e302d]">
                  <h3 className="text-white font-bold mb-2">
                    {t('privacy.section2.subsection_a.title', 'A) Si utiliza el formulario de contacto o el sistema de tickets de soporte:')}
                  </h3>
                  <p className="mb-1">
                    <span className="text-[#a15345]">{t('privacy.section2.purpose', 'Finalidad:')}</span> {t('privacy.section2.subsection_a.purpose', 'Atender su solicitud, duda, queja o sugerencia y darle respuesta.')}
                  </p>
                  <p>
                    <span className="text-[#a15345]">{t('privacy.section2.legitimation', 'Legitimación:')}</span> {t('privacy.section2.subsection_a.legitimation', 'Su consentimiento expreso al marcar la casilla de aceptación de la política de privacidad antes de enviar el formulario.')}
                  </p>
                </div>

                {/* Subsection B */}
                <div className="pl-4 border-l-2 border-[#3e302d]">
                  <h3 className="text-white font-bold mb-2">
                    {t('privacy.section2.subsection_b.title', 'B) Si se registra como usuario en la plataforma, adquiere una membresía o realiza una compra en la tienda:')}
                  </h3>
                  <p className="mb-1">
                    <span className="text-[#a15345]">{t('privacy.section2.purpose', 'Finalidad:')}</span> {t('privacy.section2.subsection_b.purpose', 'Gestionar su alta como usuario, procesar los pagos de las membresías o productos, gestionar el acceso a los contenidos restringidos (vídeos, cursos), gestionar la facturación y la relación contractual.')}
                  </p>
                  <p>
                    <span className="text-[#a15345]">{t('privacy.section2.legitimation', 'Legitimación:')}</span> {t('privacy.section2.subsection_b.legitimation', 'La ejecución de un contrato en el que el interesado es parte (Términos y Condiciones de contratación) y el cumplimiento de obligaciones legales (fiscales y contables).')}
                  </p>
                </div>

                {/* Subsection C */}
                <div className="pl-4 border-l-2 border-[#3e302d]">
                  <h3 className="text-white font-bold mb-2">
                    {t('privacy.section2.subsection_c.title', 'C) Si se suscribe a nuestro boletín (newsletter):')}
                  </h3>
                  <p className="mb-1">
                    <span className="text-[#a15345]">{t('privacy.section2.purpose', 'Finalidad:')}</span> {t('privacy.section2.subsection_c.purpose', 'Enviarle comunicaciones electrónicas (correos) con novedades, artículos del blog, ofertas comerciales de nuestros productos o servicios y contenido exclusivo.')}
                  </p>
                  <p>
                    <span className="text-[#a15345]">{t('privacy.section2.legitimation', 'Legitimación:')}</span> {t('privacy.section2.subsection_c.legitimation', 'Su consentimiento expreso al marcar la casilla correspondiente en los formularios de suscripción.')}
                  </p>
                </div>

                {/* Subsection D */}
                <div className="pl-4 border-l-2 border-[#3e302d]">
                  <h3 className="text-white font-bold mb-2">
                    {t('privacy.section2.subsection_d.title', 'D) Si deja comentarios en los vídeos o el blog:')}
                  </h3>
                  <p className="mb-1">
                    <span className="text-[#a15345]">{t('privacy.section2.purpose', 'Finalidad:')}</span> {t('privacy.section2.subsection_d.purpose', 'Gestionar y publicar su comentario en la plataforma para fomentar la participación de la comunidad.')}
                  </p>
                  <p>
                    <span className="text-[#a15345]">{t('privacy.section2.legitimation', 'Legitimación:')}</span> {t('privacy.section2.subsection_d.legitimation', 'Su consentimiento al enviar el comentario.')}
                  </p>
                </div>

                {/* Subsection E */}
                <div className="pl-4 border-l-2 border-[#3e302d]">
                  <h3 className="text-white font-bold mb-2">
                    {t('privacy.section2.subsection_e.title', 'E) Análisis de navegación (Google Analytics):')}
                  </h3>
                  <p className="mb-1">
                    <span className="text-[#a15345]">{t('privacy.section2.purpose', 'Finalidad:')}</span> {t('privacy.section2.subsection_e.purpose', 'Analizar cómo los usuarios utilizan el sitio web para mejorar la experiencia de usuario y nuestros servicios, mediante el uso de cookies.')}
                  </p>
                  <p>
                    <span className="text-[#a15345]">{t('privacy.section2.legitimation', 'Legitimación:')}</span> {t('privacy.section2.subsection_e.legitimation', 'Su consentimiento al aceptar las cookies analíticas en el banner de cookies (ver Política de Cookies).')}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-12" id="section-3">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">3</span>
                {t('privacy.section3.title_full', 'PLAZO DE CONSERVACIÓN DE LOS DATOS')}
              </h2>
              <div className="text-gray-300 space-y-4 leading-relaxed">
                <p className="italic text-[#baa4a0]">
                  {t('privacy.section3.question', '¿Por cuánto tiempo conservaremos sus datos?')}
                </p>
                <ul className="list-disc pl-5 space-y-3 marker:text-[#a15345]">
                  <li>
                    <strong className="text-white">{t('privacy.section3.item1_title', 'Datos de suscriptores a la newsletter y usuarios de contacto:')}</strong> {t('privacy.section3.item1_desc', 'Se conservarán mientras no solicite su supresión o revoque su consentimiento para el envío de comunicaciones.')}
                  </li>
                  <li>
                    <strong className="text-white">{t('privacy.section3.item2_title', 'Datos de clientes/miembros (datos fiscales y de facturación):')}</strong> {t('privacy.section3.item2_desc', 'Se conservarán durante el tiempo necesario para cumplir con las obligaciones legales correspondientes (generalmente, 5 años según el Código Civil y 6 años según el Código de Comercio para libros contables).')}
                  </li>
                  <li>
                    <strong className="text-white">{t('privacy.section3.item3_title', 'Datos de usuarios registrados:')}</strong> {t('privacy.section3.item3_desc', 'Mientras mantenga su cuenta activa en la plataforma. Si decide darse de baja, sus datos serán bloqueados y posteriormente eliminados tras los plazos legales de prescripción de responsabilidades.')}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="mb-12" id="section-4">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">4</span>
                {t('privacy.section4.title_full', 'DESTINATARIOS DE LOS DATOS')}
              </h2>
              <div className="text-gray-300 space-y-4 leading-relaxed">
                <p className="italic text-[#baa4a0]">
                  {t('privacy.section4.question', '¿A quién se comunican sus datos?')}
                </p>
                <p>
                  {t('privacy.section4.intro', 'Para poder prestar los servicios estrictamente necesarios para el desarrollo de la actividad, compartimos datos con los siguientes prestadores de servicios bajo sus correspondientes condiciones de privacidad:')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-[#3e302d]/20 p-4 rounded border border-[#3e302d]/50">
                    <h4 className="text-white font-bold text-sm mb-1">
                      {t('privacy.section4.hosting_title', 'Hosting (Alojamiento web)')}
                    </h4>
                    <p className="text-sm">
                      {t('privacy.section4.hosting_desc', 'La web está alojada en los servidores de Hostinger International Ltd., ubicados en la Unión Europea.')}
                    </p>
                  </div>
                  <div className="bg-[#3e302d]/20 p-4 rounded border border-[#3e302d]/50">
                    <h4 className="text-white font-bold text-sm mb-1">
                      {t('privacy.section4.email_title', 'Plataforma de Email Marketing')}
                    </h4>
                    <p className="text-sm">
                      {t('privacy.section4.email_desc', 'Utilizamos MailerLite para el envío de boletines. Es una empresa ubicada en la Unión Europea (Lituania).')}
                    </p>
                  </div>
                  <div className="bg-[#3e302d]/20 p-4 rounded border border-[#3e302d]/50 md:col-span-2">
                    <h4 className="text-white font-bold text-sm mb-1">
                      {t('privacy.section4.payment_title', 'Pasarela de Pago')}
                    </h4>
                    <p className="text-sm">
                      {t('privacy.section4.payment_desc', 'Los pagos de membresías y productos se procesan a través de Stripe. Sus datos bancarios son tratados directamente por Stripe en entornos seguros; SACRART no tiene acceso a los datos completos de su tarjeta. Stripe Payments Europe, Ltd. es su entidad en la UE.')}
                    </p>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-[#a15345]">
                  <li>
                    <strong className="text-white">{t('privacy.section4.analytics_title', 'Análisis web:')}</strong> {t('privacy.section4.analytics_desc', 'Se utilizan los servicios de análisis de Google Analytics (Google Ireland Limited).')}
                  </li>
                  <li>
                    <strong className="text-white">{t('privacy.section4.legal_title', 'Obligaciones legales:')}</strong> {t('privacy.section4.legal_desc', 'Sus datos podrán ser cedidos a la Agencia Tributaria, bancos u otras administraciones públicas en los casos en que exista una obligación legal para la PROPIETARIA.')}
                  </li>
                </ul>
                <div className="mt-6 bg-[#a15345]/10 p-4 rounded-lg border border-[#a15345]/20">
                  <strong className="text-[#a15345] block mb-2">
                    {t('privacy.section4.transfers_title', 'Transferencias Internacionales')}
                  </strong>
                  <p className="text-sm">
                    {t('privacy.section4.transfers_desc', 'Algunos de los proveedores mencionados (como Stripe o Google) tienen sus matrices en Estados Unidos. Aunque sus filiales europeas gestionan los datos, pueden producirse transferencias internacionales. Dichas transferencias se realizan bajo garantías adecuadas, como las Cláusulas Contractuales Tipo aprobadas por la Comisión Europea o el Marco de Privacidad de Datos UE-EE.UU. (Data Privacy Framework).')}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="mb-12" id="section-5">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">5</span>
                {t('privacy.section5.title_full', 'DERECHOS DE LOS USUARIOS')}
              </h2>
              <div className="text-gray-300 space-y-4 leading-relaxed">
                <p className="italic text-[#baa4a0]">
                  {t('privacy.section5.question', '¿Cuáles son sus derechos cuando nos facilita sus datos?')}
                </p>
                <p>
                  {t('privacy.section5.intro', 'Cualquier persona tiene derecho a obtener confirmación sobre si en SACRART estamos tratando datos personales que les conciernan, o no.')}
                </p>
                <p>{t('privacy.section5.intro2', 'Las personas interesadas tienen derecho a:')}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <li className="flex items-center gap-2 bg-[#3e302d]/40 p-3 rounded">
                    <span className="material-symbols-outlined text-[#a15345] text-sm">check_circle</span>
                    {t('privacy.section5.right1', 'Solicitar el acceso a los datos')}
                  </li>
                  <li className="flex items-center gap-2 bg-[#3e302d]/40 p-3 rounded">
                    <span className="material-symbols-outlined text-[#a15345] text-sm">check_circle</span>
                    {t('privacy.section5.right2', 'Solicitar su rectificación o supresión')}
                  </li>
                  <li className="flex items-center gap-2 bg-[#3e302d]/40 p-3 rounded">
                    <span className="material-symbols-outlined text-[#a15345] text-sm">check_circle</span>
                    {t('privacy.section5.right3', 'Solicitar la limitación de su tratamiento')}
                  </li>
                  <li className="flex items-center gap-2 bg-[#3e302d]/40 p-3 rounded">
                    <span className="material-symbols-outlined text-[#a15345] text-sm">check_circle</span>
                    {t('privacy.section5.right4', 'Oponerse al tratamiento')}
                  </li>
                  <li className="flex items-center gap-2 bg-[#3e302d]/40 p-3 rounded">
                    <span className="material-symbols-outlined text-[#a15345] text-sm">check_circle</span>
                    {t('privacy.section5.right5', 'Solicitar la portabilidad de los datos')}
                  </li>
                  <li className="flex items-center gap-2 bg-[#3e302d]/40 p-3 rounded">
                    <span className="material-symbols-outlined text-[#a15345] text-sm">check_circle</span>
                    {t('privacy.section5.right6', 'Retirar el consentimiento prestado')}
                  </li>
                </ul>
                <p className="mt-4">
                  {t('privacy.section5.exercise', 'Para ejercer estos derechos, el usuario puede enviar un correo electrónico a')} <a className="text-[#a15345] hover:underline font-medium" href="mailto:anarey@sacrart.com">anarey@sacrart.com</a>, {t('privacy.section5.exercise_cont', 'adjuntando una copia de su DNI o documento equivalente para acreditar su identidad, e indicando qué derecho desea ejercer.')}
                </p>
                <p>
                  {t('privacy.section5.complaint', 'Asimismo, el interesado tiene derecho a presentar una reclamación ante la autoridad de control competente (en España, la Agencia Española de Protección de Datos - www.aepd.es) si considera que el tratamiento no se ajusta a la normativa vigente.')}
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="mb-12" id="section-6">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">6</span>
                {t('privacy.section6.title_full', 'MENORES DE EDAD')}
              </h2>
              <div className="text-gray-300 leading-relaxed bg-[#3e302d]/20 border-l-4 border-red-500/50 p-4 rounded-r">
                <p>
                  {t('privacy.section6.content', 'La web de SACRART no se dirige a menores de edad. El titular de la web declina cualquier responsabilidad por el incumplimiento de este requisito por parte de los usuarios. Para registrarse o comprar en la plataforma, el usuario debe tener al menos 18 años o contar con la autorización de sus tutores legales.')}
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section className="mb-12" id="section-7">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">7</span>
                {t('privacy.section7.title_full', 'EXACTITUD Y VERACIDAD DE LOS DATOS')}
              </h2>
              <div className="text-gray-300 leading-relaxed">
                <p>
                  {t('privacy.section7.content', 'El usuario es el único responsable de la veracidad y corrección de los datos que remita a SACRART, exonerando a la PROPIETARIA de cualquier responsabilidad al respecto. Los usuarios garantizan y responden, en cualquier caso, de la exactitud, vigencia y autenticidad de los datos personales facilitados, y se comprometen a mantenerlos debidamente actualizados.')}
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section className="mb-20" id="section-8">
              <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-full bg-[#a15345] text-white text-sm font-bold">8</span>
                {t('privacy.section8.title_full', 'MEDIDAS DE SEGURIDAD')}
              </h2>
              <div className="text-gray-300 leading-relaxed">
                <p>
                  {t('privacy.section8.content', 'SACRART ha adoptado las medidas de seguridad técnicas y organizativas necesarias para garantizar la seguridad de sus datos personales y evitar su alteración, pérdida y tratamiento y/o acceso no autorizado, habida cuenta del estado de la tecnología, la naturaleza de los datos almacenados y los riesgos a que están expuestos, ya provengan de la acción humana o del medio físico o natural.')}
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

