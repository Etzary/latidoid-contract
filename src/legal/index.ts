/**
 * Texto de los documentos legales como datos, para que la web y el móvil
 * muestren la misma redacción sin duplicarla. Los títulos, subtítulos y el
 * aviso final viven en las traducciones de cada app; aquí va el cuerpo
 * (secciones, párrafos y viñetas) que se versiona con el contrato.
 */

/** Viñeta con una etiqueta resaltada al inicio, por ejemplo «Cuenta:». */
export type LegalBullet = {
  label: string;
  text: string;
};

/** Sección de un documento legal. */
export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: LegalBullet[];
};

/** Identificador de los documentos legales versionados. */
export type LegalDocumentId = 'terms' | 'privacy';

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Aceptación',
    paragraphs: [
      'Al crear una cuenta o usar LatidoID aceptas estos Términos. Si no estás de acuerdo, no uses el servicio.',
    ],
  },
  {
    title: '2. Licencia de uso',
    paragraphs: [
      'Te otorgamos una licencia personal, no exclusiva y no transferible para usar la aplicación mientras cumplas estos Términos. La aplicación es de uso informativo y de apoyo a la emergencia, no un producto médico.',
    ],
  },
  {
    title: '3. Tu cuenta',
    paragraphs: [
      'Eres responsable de la veracidad de los datos de tu ficha y de mantener seguras tus credenciales. Si activas la verificación en dos pasos, guarda tus códigos de respaldo.',
    ],
  },
  {
    title: '4. Uso aceptable',
    paragraphs: [
      'No puedes usar el servicio para suplantar a otra persona, compartir datos médicos de terceros sin su consentimiento ni intentar vulnerar la seguridad del sistema.',
    ],
  },
  {
    title: '5. Suscripciones y pagos',
    paragraphs: [
      'El acceso al QR de emergencia requiere una suscripción activa. Los cobros los procesan las pasarelas (Mercado Pago y OpenPay) y se renuevan según el plan que elijas. Puedes cancelar cuando quieras; el acceso se mantiene hasta el final del periodo pagado.',
    ],
  },
  {
    title: '6. No sustituye a los servicios de emergencia',
    paragraphs: [
      'LatidoID complementa, pero no reemplaza, la atención médica ni a los servicios de emergencia. Ante una urgencia, llama siempre a los servicios locales. La información se ofrece "tal cual" y no garantizamos que esté libre de errores o disponible siempre.',
    ],
  },
  {
    title: '7. Propiedad intelectual',
    paragraphs: [
      'La marca, el software y el diseño son nuestros o de sus licenciantes. Tus datos siguen siendo tuyos.',
    ],
  },
  {
    title: '8. Cambios y terminación',
    paragraphs: [
      'Podemos actualizar estos Términos y te avisaremos de los cambios relevantes. Podemos suspender el servicio ante un uso indebido. Tú puedes dejar de usar la aplicación y eliminar tu cuenta en cualquier momento.',
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Responsable y alcance',
    paragraphs: [
      'LatidoID trata los datos que tú proporcionas para ofrecer la ficha médica de emergencia y el código QR. Esta política aplica a la aplicación web y móvil y al sitio público de la ficha de emergencia.',
    ],
  },
  {
    title: '2. Datos que tratamos',
    bullets: [
      {
        label: 'Cuenta:',
        text: 'nombre, correo electrónico, teléfono y, si entras con Google, tu identificador de Google.',
      },
      {
        label: 'Ficha médica:',
        text: 'tipo de sangre, alergias, medicamentos, antecedentes y contactos de emergencia. Opcionalmente puedes añadir datos de seguro o identificación.',
      },
      {
        label: 'Ubicación:',
        text: 'solo si activas la sincronización de forma explícita. Es opcional y puedes desactivarla cuando quieras.',
      },
      {
        label: 'Registro de accesos:',
        text: 'fecha y origen de cada consulta a tu ficha de emergencia.',
      },
    ],
  },
  {
    title: '3. Para qué los usamos',
    paragraphs: [
      'Para mostrar tu ficha cuando se escanea tu QR, enviar los avisos a tus contactos de emergencia, gestionar tu cuenta y tu suscripción, y mostrarte tu historial de accesos. No usamos tus datos médicos con fines publicitarios.',
    ],
  },
  {
    title: '4. Consentimiento',
    paragraphs: [
      'Los datos de salud son datos sensibles. Al guardar tu ficha otorgas tu consentimiento expreso para tratarlos con la única finalidad de la emergencia. Puedes retirarlo en cualquier momento desactivando tu QR o eliminando tu ficha.',
    ],
  },
  {
    title: '5. Con quién se comparten',
    paragraphs: [
      'Tu ficha se muestra únicamente a quien escanee el QR que tú compartes. Además usamos proveedores para procesar pagos (Mercado Pago y OpenPay) y para enviar correo y mensajes (Resend y Twilio). No vendemos tus datos.',
    ],
  },
  {
    title: '6. Seguridad',
    paragraphs: [
      'La ficha médica se guarda cifrada en reposo (AES-256) y las sesiones viajan en cookies httpOnly firmadas, nunca expuestas al JavaScript de la página.',
    ],
  },
  {
    title: '7. Conservación',
    paragraphs: [
      'Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta o tu ficha, los datos asociados se eliminan o se anonimizan.',
    ],
  },
  {
    title: '8. Tus derechos',
    paragraphs: [
      'Puedes acceder, corregir, actualizar o eliminar tu información desde la aplicación y solicitar la portabilidad o la cancelación de tu cuenta escribiendo a soporte.',
    ],
  },
  {
    title: '9. Contacto',
    paragraphs: [
      'Para cualquier duda sobre esta política escríbenos a través de los canales de contacto que aparecen en la aplicación.',
    ],
  },
];

/** Documentos legales indexados por identificador. */
export const legalDocuments: Record<LegalDocumentId, LegalSection[]> = {
  terms: TERMS_SECTIONS,
  privacy: PRIVACY_SECTIONS,
};
