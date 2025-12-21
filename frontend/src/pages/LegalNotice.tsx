import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { Link } from 'react-router-dom';

const LegalNotice = () => {
  const { t } = useTranslation();
  const { navigateWithLocale, getPathWithLocale } = useLocale();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col">
      <main className="flex-grow pt-32 pb-20 bg-[#0f0f0f]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigateWithLocale('/')}
              className="mb-8 text-[#A05245] hover:text-[#b56053] transition-colors flex items-center gap-2 text-sm"
            >
              <i className="fa-solid fa-arrow-left"></i>
              {t('common.back', 'Volver')}
            </button>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-12 tracking-tight border-b border-white/10 pb-6">
              {t('legal_notice.title', 'Aviso Legal')}
            </h1>

            <div className="text-content text-sm md:text-base bg-[#18181b] p-8 md:p-12 rounded-lg border border-white/5 shadow-2xl">
              <h2 className="mt-0 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section1.title', '1. DATOS IDENTIFICATIVOS')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section1.p1', 'En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), a continuación se reflejan los siguientes datos:')}
              </p>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section1.p2', 'La titular del dominio web www.sacrart.com es:')}
                <br />
                <strong>{t('legal_notice.section1.name', 'Nombre:')}</strong> {t('legal_notice.section1.name_value', 'Ana Rey Martínez (en adelante, la PROPIETARIA).')}
                <br />
                <strong>{t('legal_notice.section1.nif', 'N.I.F.:')}</strong> 75768495D
                <br />
                <strong>{t('legal_notice.section1.address', 'Domicilio:')}</strong> {t('legal_notice.section1.address_value', 'Ctra. Marquesado C/Gaviota 11138 Puerto Real (Cádiz).')}
                <br />
                <strong>{t('legal_notice.section1.email', 'Correo electrónico de contacto:')}</strong> anarey@sacrart.com
                <br />
                <strong>{t('legal_notice.section1.phone', 'Teléfono:')}</strong> +34 639 374 077
              </p>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section1.p3', 'Asimismo, se informa de que los precios de los productos o servicios mostrados en este sitio web incluyen el Impuesto sobre el Valor Añadido (IVA), a menos que se indique expresamente lo contrario.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section2.title', '2. USUARIOS')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section2.p1', 'El acceso y/o uso de este portal de la PROPIETARIA atribuye la condición de USUARIO, que acepta, desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas. Las citadas Condiciones serán de aplicación independientemente de las Condiciones Generales de Contratación que en su caso resulten de obligado cumplimiento.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section3.title', '3. USO DEL PORTAL')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section3.p1', 'www.sacrart.com proporciona el acceso a multitud de informaciones, servicios, programas o datos (en adelante, "los contenidos") en Internet pertenecientes a la PROPIETARIA o a sus licenciantes a los que el USUARIO pueda tener acceso. El USUARIO asume la responsabilidad del uso del portal. Dicha responsabilidad se extiende al registro que fuese necesario para acceder a determinados servicios o contenidos.')}
              </p>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section3.p2', 'En dicho registro el USUARIO será responsable de aportar información veraz y lícita. Como consecuencia de este registro, al USUARIO se le puede proporcionar una contraseña de la que será responsable, comprometiéndose a hacer un uso diligente y confidencial de la misma. El USUARIO se compromete a hacer un uso adecuado de los contenidos y servicios que la PROPIETARIA ofrece a través de su portal y con carácter enunciativo pero no limitativo, a no emplearlos para:')}
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-300 space-y-2">
                <li>{t('legal_notice.section3.li1', '(i) incurrir en actividades ilícitas, ilegales o contrarias a la buena fe y al orden público;')}</li>
                <li>{t('legal_notice.section3.li2', '(ii) difundir contenidos o propaganda de carácter racista, xenófobo, pornográfico-ilegal, de apología del terrorismo o atentatorio contra los derechos humanos;')}</li>
                <li>{t('legal_notice.section3.li3', '(iii) provocar daños en los sistemas físicos y lógicos de la PROPIETARIA, de sus proveedores o de terceras personas, introducir o difundir en la red virus informáticos o cualesquiera otros sistemas físicos o lógicos que sean susceptibles de provocar los daños anteriormente mencionados;')}</li>
                <li>{t('legal_notice.section3.li4', '(iv) intentar acceder y, en su caso, utilizar las cuentas de correo electrónico de otros usuarios y modificar o manipular sus mensajes.')}</li>
              </ul>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section4.title', '4. PROPIEDAD INTELECTUAL E INDUSTRIAL')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section4.p1', 'La PROPIETARIA por sí o como cesionaria, es titular de todos los derechos de propiedad intelectual e industrial de su página web, así como de los elementos contenidos en la misma (a título enunciativo: imágenes, sonido, audio, vídeo, software o textos; marcas o logotipos, combinaciones de colores, estructura y diseño, selección de materiales usados, programas de ordenador necesarios para su funcionamiento, acceso y uso, etc.), titularidad de la PROPIETARIA o bien de sus licenciantes.')}
              </p>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section4.p2', 'Todos los derechos reservados. En virtud de lo dispuesto en los artículos 8 y 32.1, párrafo segundo, de la Ley de Propiedad Intelectual, quedan expresamente prohibidas la reproducción, la distribución y la comunicación pública, incluida su modalidad de puesta a disposición, de la totalidad o parte de los contenidos de esta página web, con fines comerciales, en cualquier soporte y por cualquier medio técnico, sin la autorización de la PROPIETARIA. El USUARIO se compromete a respetar los derechos de Propiedad Intelectual e Industrial titularidad de la PROPIETARIA.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section5.title', '5. EXCLUSIÓN DE GARANTÍAS Y RESPONSABILIDAD')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section5.p1', 'La PROPIETARIA no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, falta de disponibilidad del portal o la transmisión de virus o programas maliciosos o lesivos en los contenidos, a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section6.title', '6. MODIFICACIONES')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section6.p1', 'La PROPIETARIA se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas en su portal, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados en su portal.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section7.title', '7. ENLACES')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section7.p1', 'En el caso de que en www.sacrart.com se dispusiesen enlaces o hipervínculos hacía otros sitios de Internet, la PROPIETARIA no ejercerá ningún tipo de control sobre dichos sitios y contenidos. En ningún caso la PROPIETARIA asumirá responsabilidad alguna por los contenidos de algún enlace perteneciente a un sitio web ajeno, ni garantizará la disponibilidad técnica, calidad, fiabilidad, exactitud, amplitud, veracidad, validez y constitucionalidad de cualquier material o información contenida en ninguno de dichos hipervínculos u otros sitios de Internet.')}
              </p>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section7.p2', 'Igualmente la inclusión de estas conexiones externas no implicará ningún tipo de asociación, fusión o participación con las entidades conectadas.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section8.title', '8. DERECHO DE EXCLUSIÓN')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section8.p1', 'La PROPIETARIA se reserva el derecho a denegar o retirar el acceso a portal y/o los servicios ofrecidos sin necesidad de preaviso, a instancia propia o de un tercero, a aquellos usuarios que incumplan las presentes Condiciones Generales de Uso.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section9.title', '9. GENERALIDADES')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section9.p1', 'La PROPIETARIA perseguirá el incumplimiento de las presentes condiciones así como cualquier utilización indebida de su portal ejerciendo todas las acciones civiles y penales que le puedan corresponder en derecho.')}
              </p>

              <h2 className="mt-10 mb-4 font-bold text-white text-xl tracking-tight">
                {t('legal_notice.section10.title', '10. LEGISLACIÓN APLICABLE Y JURISDICCIÓN')}
              </h2>
              <p className="mb-6 leading-relaxed text-gray-300">
                {t('legal_notice.section10.p1', 'La relación entre la PROPIETARIA y el USUARIO se regirá por la normativa española vigente y cualquier controversia se someterá a los Juzgados y tribunales de la ciudad de Cádiz (salvo en los casos en que la normativa de consumo establezca otro fuero distinto para el usuario consumidor).')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LegalNotice;



