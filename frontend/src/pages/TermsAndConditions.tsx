import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { Link } from 'react-router-dom';

const TermsAndConditions = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [activeSection, setActiveSection] = useState('id-y-objeto');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'id-y-objeto',
        'descripcion',
        'precios',
        'proceso',
        'membresia',
        'tienda',
        'devoluciones',
        'garantias',
        'ley'
      ];

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
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
    <div className="min-h-screen bg-[#1d1615] text-white flex flex-col">
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-10 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
          {/* Sidebar Navigation (Desktop Sticky) */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <div className="sticky top-28 space-y-6">
              <p className="text-xs font-bold text-[#8f473d] uppercase tracking-widest mb-4 border-b border-[#3e2f2d] pb-2">
                {t('terms.contents', 'Contenidos')}
              </p>
              <nav className="flex flex-col gap-0.5 relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-[#3e2f2d]"></div>
                <a
                  onClick={() => scrollToSection('id-y-objeto')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'id-y-objeto'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section1.title', '1. Identificación y Objeto')}
                </a>
                <a
                  onClick={() => scrollToSection('descripcion')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'descripcion'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section2.title', '2. Descripción Servicios')}
                </a>
                <a
                  onClick={() => scrollToSection('precios')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'precios'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section3.title', '3. Precios e Impuestos')}
                </a>
                <a
                  onClick={() => scrollToSection('proceso')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'proceso'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section4.title', '4. Proceso de Compra')}
                </a>
                <a
                  onClick={() => scrollToSection('membresia')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'membresia'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section5.title', '5. Membresía (Streaming)')}
                </a>
                <a
                  onClick={() => scrollToSection('tienda')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'tienda'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section6.title', '6. Tienda Online')}
                </a>
                <a
                  onClick={() => scrollToSection('devoluciones')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'devoluciones'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section7.title', '7. Devoluciones')}
                </a>
                <a
                  onClick={() => scrollToSection('garantias')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'garantias'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section8.title', '8. Garantías')}
                </a>
                <a
                  onClick={() => scrollToSection('ley')}
                  className={`text-sm py-2 pl-4 border-l-2 -ml-[1px] transition-all block cursor-pointer ${
                    activeSection === 'ley'
                      ? 'text-white border-[#8f473d]'
                      : 'text-[#baa3a0] border-transparent hover:text-[#8f473d] hover:border-[#8f473d]'
                  }`}
                >
                  {t('terms.section9.title', '9. Ley y Jurisdicción')}
                </a>
              </nav>
              <div className="pt-6">
                <button
                  onClick={() => navigateWithLocale('/')}
                  className="flex items-center gap-2 text-sm text-[#baa3a0] hover:text-white transition-colors group"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                  {t('terms.back_home', 'Volver al inicio')}
                </button>
              </div>
            </div>
          </aside>

          {/* Legal Content Column */}
          <div className="col-span-1 lg:col-span-8 xl:col-span-8">
            <div className="mb-12 border-b border-[#3e2f2d] pb-8">
              <h1 className="text-3xl md:text-5xl font-black leading-[1.1] tracking-[-0.033em] text-white mb-6">
                {t('terms.title', 'Términos y Condiciones Generales de Contratación')}
              </h1>
              <div className="flex items-center gap-2 text-[#baa3a0] text-sm font-normal">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <p>
                  {t('terms.last_update', 'Última actualización:')} <span className="text-white">24 de Mayo, 2024</span>
                </p>
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-16 text-[#d1d1d1] leading-relaxed text-base font-light">
              {/* Section 1 */}
              <section className="scroll-mt-32 group" id="id-y-objeto">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">01</span>
                  {t('terms.section1.title', 'Identificación del Titular y Objeto')}
                </h3>
                <div className="space-y-4">
                  <p>
                    {t('terms.section1.p1', 'Las presentes Condiciones Generales de Contratación (en adelante, "Condiciones") regulan la relación comercial entre')} <strong>Ana Rey Martínez</strong> {t('terms.section1.p1_cont', '(en adelante, "la PROPIETARIA" o "SACRART"), con N.I.F. 75768495D y domicilio en Ctra. Marquesado C/Gaviota 11138 Puerto Real (Cádiz), y los usuarios (en adelante, "el CLIENTE") que adquieran productos o servicios a través del sitio web')} <a className="text-[#8f473d] hover:text-white underline underline-offset-4 decoration-[#8f473d]/50 hover:decoration-white transition-all" href="https://www.sacrart.com">www.sacrart.com</a>.
                  </p>
                  <p>
                    {t('terms.section1.p2', 'Puede contactar con nosotros a través del correo electrónico:')} <a className="text-[#8f473d] hover:text-white underline underline-offset-4 decoration-[#8f473d]/50 hover:decoration-white transition-all" href="mailto:anarey@sacrart.com">anarey@sacrart.com</a>.
                  </p>
                  <p>
                    {t('terms.section1.p3', 'La adquisición de cualquiera de los productos o servicios (membresías) ofrecidos en esta web implica la aceptación plena y sin reservas de todas y cada una de las presentes Condiciones, que el CLIENTE declara haber leído y entendido antes de finalizar el proceso de compra.')}
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="scroll-mt-32 group" id="descripcion">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">02</span>
                  {t('terms.section2.title', 'Descripción de los Servicios y Productos')}
                </h3>
                <p className="mb-6">{t('terms.section2.intro', 'SACRART es una plataforma que ofrece un doble servicio:')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#2a201e] border border-[#3e2f2d] p-6 rounded-lg">
                    <span className="material-symbols-outlined text-[#8f473d] mb-3 text-3xl">play_circle</span>
                    <h4 className="text-white font-bold mb-2">{t('terms.section2.streaming_title', 'Servicio de Streaming (Membresía)')}</h4>
                    <p className="text-sm text-[#baa3a0]">
                      {t('terms.section2.streaming_desc', 'Acceso digital bajo demanda a un catálogo de contenidos audiovisuales (vídeos) relacionados con el arte sacro, mediante el pago de una suscripción periódica.')}
                    </p>
                  </div>
                  <div className="bg-[#2a201e] border border-[#3e2f2d] p-6 rounded-lg">
                    <span className="material-symbols-outlined text-[#8f473d] mb-3 text-3xl">storefront</span>
                    <h4 className="text-white font-bold mb-2">{t('terms.section2.shop_title', 'Tienda Online')}</h4>
                    <p className="text-sm text-[#baa3a0]">
                      {t('terms.section2.shop_desc', 'Venta de productos físicos relacionados con la temática de la plataforma.')}
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section className="scroll-mt-32 group" id="precios">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">03</span>
                  {t('terms.section3.title', 'Precios e Impuestos')}
                </h3>
                <p className="mb-4">
                  {t('terms.section3.p1', 'Todos los precios mostrados en la web están indicados en Euros (€) e incluyen el Impuesto sobre el Valor Añadido (IVA) vigente en España que sea procedente aplicar en cada momento.')}
                </p>
                <p className="mb-4">
                  {t('terms.section3.p2', 'En el caso de venta de productos físicos a países fuera de la Unión Europea, los precios finales podrían no incluir IVA, pero el CLIENTE será responsable de los posibles aranceles, impuestos de aduana o tasas de importación que aplique el país de destino al recibir el paquete.')}
                </p>
                <p className="text-[#baa3a0] italic">
                  {t('terms.section3.p3', 'SACRART se reserva el derecho a modificar sus precios en cualquier momento. No obstante, los productos o suscripciones se facturarán al precio en vigor en el momento del registro del pedido o de la renovación de la suscripción.')}
                </p>
              </section>

              {/* Section 4 */}
              <section className="scroll-mt-32 group" id="proceso">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">04</span>
                  {t('terms.section4.title', 'Proceso de Compra y Formas de Pago')}
                </h3>
                <div className="space-y-4">
                  <p>
                    {t('terms.section4.p1', 'Para realizar una compra o suscribirse, el CLIENTE deberá registrarse en la plataforma y seguir el procedimiento de compra online, facilitando los datos requeridos y seleccionando el método de pago.')}
                  </p>
                  <p>
                    {t('terms.section4.p2', 'La forma de pago aceptada es Tarjeta de crédito o débito, procesada de forma segura a través de la pasarela de pagos externa Stripe. SACRART no almacena los datos completos de la tarjeta del CLIENTE.')}
                  </p>
                  <p>
                    {t('terms.section4.p3', 'Al finalizar la compra, el CLIENTE recibirá un correo electrónico de confirmación con los detalles de su pedido o suscripción.')}
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="scroll-mt-32 group" id="membresia">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">05</span>
                  {t('terms.section5.title', 'Condiciones Específicas del Servicio de Membresía')}
                </h3>
                <div className="pl-4 border-l border-[#3e2f2d] space-y-6">
                  <div>
                    <h4 className="text-white font-bold mb-2">{t('terms.section5.sub1_title', '5.1. Planes y Duración')}</h4>
                    <p className="text-[#baa3a0]">
                      {t('terms.section5.sub1_desc', 'SACRART ofrece diferentes planes de suscripción (ej. Mensual, Trimestral). El acceso a los contenidos es inmediato tras la confirmación del pago.')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-2">{t('terms.section5.sub2_title', '5.2. Renovación Automática')}</h4>
                    <p className="text-[#baa3a0]">
                      {t('terms.section5.sub2_desc', 'Las suscripciones son autorrenovables. Esto significa que, al finalizar el periodo contratado (un mes o un trimestre), se cobrará automáticamente el importe del siguiente periodo en la tarjeta facilitada por el CLIENTE, salvo que este haya cancelado su suscripción previamente.')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-2">{t('terms.section5.sub3_title', '5.3. Cancelación de la Suscripción')}</h4>
                    <p className="text-[#baa3a0] mb-3">
                      {t('terms.section5.sub3_desc', 'El CLIENTE puede cancelar la renovación automática de su suscripción en cualquier momento y de forma sencilla a través de su perfil de usuario en la plataforma (botón "Cancelar suscripción" o similar).')}
                    </p>
                    <div className="bg-[#2a201e] p-4 rounded-lg border border-[#3e2f2d] flex gap-3">
                      <span className="material-symbols-outlined text-[#8f473d] mt-0.5">info</span>
                      <p className="text-sm">
                        <strong className="text-white">{t('terms.section5.sub3_effect_title', 'Efectos de la cancelación:')}</strong> {t('terms.section5.sub3_effect_desc', 'Si el CLIENTE cancela su suscripción, seguirá teniendo acceso a los contenidos hasta la finalización del periodo de facturación que ya haya pagado. Al terminar dicho periodo, el acceso se cortará y no se realizarán más cobros. No se realizan reembolsos parciales por periodos no disfrutados si se cancela a mitad de ciclo.')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section className="scroll-mt-32 group" id="tienda">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">06</span>
                  {t('terms.section6.title', 'Condiciones Específicas de la Tienda Online')}
                </h3>
                <div className="bg-[#2a201e] p-6 rounded-lg border border-[#3e2f2d]">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8f473d]">local_shipping</span>
                    {t('terms.section6.sub1_title', '6.1. Envíos')}
                  </h4>
                  <p className="mb-4">
                    {t('terms.section6.sub1_p1', 'SACRART realiza envíos a nivel internacional. Los gastos de envío no están incluidos en el precio del producto y son variables en función del destino y peso del pedido. El coste exacto del envío se calculará y mostrará al CLIENTE antes de finalizar la compra.')}
                  </p>
                  <p className="text-sm text-[#baa3a0]">
                    * {t('terms.section6.sub1_note', 'Los plazos de entrega son estimaciones y pueden variar según el destino y la empresa de transporte.')}
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="scroll-mt-32 group" id="devoluciones">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">07</span>
                  {t('terms.section7.title', 'Política de Devoluciones y Derecho de Desistimiento')}
                </h3>
                <div className="mb-10">
                  <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-xs border-b border-[#3e2f2d] pb-2 w-max pr-10">
                    {t('terms.section7.sub1_title', '7.1. Para Productos Físicos (Tienda Online)')}
                  </h4>
                  <p className="mb-6">
                    {t('terms.section7.sub1_p1', 'De conformidad con la normativa vigente (Ley General para la Defensa de los Consumidores y Usuarios), el CLIENTE tiene derecho a desistir de su compra (devolver el producto sin dar explicaciones) en un plazo de 14 días naturales desde la recepción del pedido.')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-[#2a201e] p-5 rounded-lg border border-[#3e2f2d]">
                      <strong className="text-white block mb-2 font-display">{t('terms.section7.procedure', 'Procedimiento')}</strong>
                      <p>
                        {t('terms.section7.procedure_desc', 'Notificarlo por email a')} <a className="text-[#8f473d] hover:underline" href="mailto:anarey@sacrart.com">anarey@sacrart.com</a> {t('terms.section7.procedure_desc_cont', 'dentro del plazo indicado.')}
                      </p>
                    </div>
                    <div className="bg-[#2a201e] p-5 rounded-lg border border-[#3e2f2d]">
                      <strong className="text-white block mb-2 font-display">{t('terms.section7.conditions', 'Condiciones')}</strong>
                      <p>{t('terms.section7.conditions_desc', 'El producto debe estar en perfecto estado, sin usar y en su embalaje original.')}</p>
                    </div>
                    <div className="bg-[#2a201e] p-5 rounded-lg border border-[#3e2f2d]">
                      <strong className="text-white block mb-2 font-display">{t('terms.section7.return_costs', 'Gastos de devolución')}</strong>
                      <p>{t('terms.section7.return_costs_desc', 'El CLIENTE asumirá los costes directos de devolución (gastos de envío) de los bienes a nuestras instalaciones.')}</p>
                    </div>
                    <div className="bg-[#2a201e] p-5 rounded-lg border border-[#3e2f2d]">
                      <strong className="text-white block mb-2 font-display">{t('terms.section7.refund', 'Reembolso')}</strong>
                      <p>{t('terms.section7.refund_desc', 'Una vez verificado, SACRART devolverá el importe (menos gastos de envío originales extra) en un máximo de 14 días al mismo método de pago.')}</p>
                    </div>
                  </div>
                </div>

                {/* Emphasis Box for 7.2 */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#8f473d]/20 via-[#2a201e] to-[#1a1413] border border-[#8f473d]/40 p-6 md:p-8 shadow-2xl shadow-[#8f473d]/5">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-[180px]">gavel</span>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-[#8f473d] font-bold mb-6 uppercase tracking-wider text-sm flex items-center gap-2 border-b border-[#8f473d]/20 pb-4">
                      <span className="material-symbols-outlined">warning</span>
                      {t('terms.section7.sub2_title', '7.2. Excepción al Derecho de Desistimiento (Contenido Digital)')}
                    </h4>
                    <p className="font-bold text-white text-lg mb-4">
                      {t('terms.section7.sub2_important', 'INFORMACIÓN MUY IMPORTANTE SOBRE SUSCRIPCIONES:')}
                    </p>
                    <p className="mb-4">
                      {t('terms.section7.sub2_p1', 'El servicio de membresía de SACRART consiste en el suministro de contenido digital (vídeos en streaming) que no se presta en soporte material.')}
                    </p>
                    <p className="mb-6">
                      {t('terms.section7.sub2_p2', 'De acuerdo con el artículo 103 apartado m) de la Ley General para la Defensa de los Consumidores y Usuarios, el derecho de desistimiento de 14 días')} <strong className="text-white bg-[#8f473d]/20 px-1 rounded">{t('terms.section7.sub2_not_applicable', 'NO SERÁ APLICABLE')}</strong> {t('terms.section7.sub2_p2_cont', 'a los contratos de suministro de contenido digital una vez que la ejecución haya comenzado.')}
                    </p>
                    <div className="bg-black/40 p-5 rounded-lg border border-white/10 text-white text-sm leading-relaxed">
                      <strong>{t('terms.section7.sub2_clause_title', 'Cláusula de Aceptación:')}</strong> {t('terms.section7.sub2_clause_desc', 'Por tanto, el CLIENTE reconoce y acepta expresamente que, en el momento en que inicie la reproducción de cualquier vídeo (haga clic en "play") dentro de la plataforma tras el pago, perderá su derecho de desistimiento y no podrá solicitar la devolución del importe del periodo contratado, al haberse iniciado la ejecución del servicio con su consentimiento previo.')}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 8 */}
              <section className="scroll-mt-32 group" id="garantias">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">08</span>
                  {t('terms.section8.title', 'Garantías')}
                </h3>
                <p className="bg-[#2a201e] border-l-4 border-[#8f473d] pl-6 py-4 rounded-r-lg">
                  {t('terms.section8.p1', 'Los productos físicos vendidos en la tienda online cuentan con la garantía legal de conformidad prevista en la normativa vigente para consumidores. En caso de producto defectuoso, SACRART procederá a la reparación, sustitución, rebaja del precio o resolución del contrato, gestiones que serán gratuitas para el CLIENTE.')}
                </p>
              </section>

              {/* Section 9 */}
              <section className="scroll-mt-32 group" id="ley">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-start gap-3 group-hover:text-[#8f473d] transition-colors">
                  <span className="text-xs font-black text-[#1d1615] bg-white px-1.5 py-0.5 rounded mt-1">09</span>
                  {t('terms.section9.title', 'Ley Aplicable y Jurisdicción')}
                </h3>
                <div className="space-y-4">
                  <p>
                    {t('terms.section9.p1', 'Estas Condiciones se regirán o interpretarán conforme a la legislación española en aquello que no esté expresamente establecido.')}
                  </p>
                  <p>
                    {t('terms.section9.p2', 'En caso de controversia, y si el CLIENTE tiene la condición de consumidor conforme a la normativa, las partes se someterán a los Juzgados y Tribunales del domicilio del consumidor. Si el usuario no tiene la condición de consumidor, las partes se someten a los Juzgados y Tribunales de la ciudad de Cádiz (España), con renuncia expresa a cualquier otro fuero que pudiera corresponderles.')}
                  </p>
                  <p>
                    {t('terms.section9.p3', 'Asimismo, como entidad adherida a Confianza Online y en los términos de su Código Ético, en caso de controversias relativas a la contratación y publicidad online, protección de datos y protección de menores, el usuario podrá acudir al sistema de resolución extrajudicial de controversias de Confianza Online')} (<a className="text-[#8f473d] hover:underline" href="http://www.confianzaonline.es" target="_blank" rel="noopener noreferrer">www.confianzaonline.es</a>).
                  </p>
                  <div className="mt-6 p-4 rounded-lg border border-[#3e2f2d] bg-[#2a201e]/50 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="bg-[#3e2f2d] p-2 rounded-full text-[#baa3a0]">
                      <span className="material-symbols-outlined">public</span>
                    </div>
                    <div>
                      <strong className="text-white block mb-1 text-sm">
                        {t('terms.section9.odr_title', 'Plataforma Europea de Resolución de Litigios en Línea')}
                      </strong>
                      <p className="text-xs text-[#baa3a0]">
                        {t('terms.section9.odr_desc', 'La Comisión Europea facilita una plataforma de resolución de litigios en línea:')} <a className="text-[#8f473d] hover:underline break-all" href="http://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">http://ec.europa.eu/consumers/odr/</a>
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;



