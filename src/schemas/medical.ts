import { z } from 'zod';
import { dateOnlySchema, emptyToUndefined, geoPointSchema, idSchema, timestampSchema } from './common.js';

/** Topes que aplica el backend antes de cifrar y guardar la ficha. */
export const MEDICAL_MAX_LIST_ITEMS = 20;
export const MEDICAL_MAX_SHORT_TEXT = 120;
export const MEDICAL_MAX_LONG_TEXT = 2000;

export const bloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
export type BloodType = z.infer<typeof bloodTypeSchema>;

const shortText = () =>
  emptyToUndefined(
    z.string().max(MEDICAL_MAX_SHORT_TEXT, `Máximo ${MEDICAL_MAX_SHORT_TEXT} caracteres`),
  );

const longText = () =>
  emptyToUndefined(
    z.string().max(MEDICAL_MAX_LONG_TEXT, `Máximo ${MEDICAL_MAX_LONG_TEXT} caracteres`),
  );

const textList = () =>
  z
    .array(z.string().trim().min(1))
    .max(MEDICAL_MAX_LIST_ITEMS, `Máximo ${MEDICAL_MAX_LIST_ITEMS} elementos`)
    .optional();

export const medicationSchema = z.object({
  name: z.string().trim().min(1, 'El medicamento necesita un nombre').max(MEDICAL_MAX_SHORT_TEXT),
  dose: shortText(),
  frequency: shortText(),
});
export type Medication = z.infer<typeof medicationSchema>;

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, 'El contacto necesita un nombre').max(MEDICAL_MAX_SHORT_TEXT),
  relationship: shortText(),
  phone: z.string().trim().min(1, 'El contacto necesita un teléfono').max(MEDICAL_MAX_SHORT_TEXT),
  email: emptyToUndefined(z.string().email('Correo electrónico no válido')),
});
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

/**
 * Cuerpo de `PUT /api/medical/profile`. El backend hace un **upsert completo**:
 * los campos omitidos se pierden, así que el formulario debe enviar la ficha entera.
 */
export const medicalDataSchema = z.object({
  blood_type: bloodTypeSchema.optional(),
  date_of_birth: emptyToUndefined(dateOnlySchema),
  allergies: textList(),
  allergy_notes: longText(),
  chronic_conditions: textList(),
  medications: z.array(medicationSchema).max(MEDICAL_MAX_LIST_ITEMS).optional(),
  medical_history: longText(),
  notes: longText(),
  emergency_contacts: z.array(emergencyContactSchema).max(MEDICAL_MAX_LIST_ITEMS).optional(),
  address: longText(),
  /** Si es `true`, el domicilio se muestra a quien escanea el QR. Por defecto `false`. */
  share_address: z.boolean().optional(),
  social_security_number: shortText(),
  national_id: shortText(),
  insurance_provider: shortText(),
  insurance_policy: shortText(),
});
export type MedicalData = z.infer<typeof medicalDataSchema>;

export const emergencyAccessViewSchema = z.object({
  enabled: z.boolean(),
  url: z.string().optional(),
  /** Texto opcional que el titular imprime junto a su QR (no es dato clínico). */
  caption: z.string().optional(),
});
export type EmergencyAccessView = z.infer<typeof emergencyAccessViewSchema>;

export const lastLocationViewSchema = z.object({
  location: geoPointSchema,
  recorded_at: timestampSchema,
  expires_at: timestampSchema,
});
export type LastLocationView = z.infer<typeof lastLocationViewSchema>;

/** Respuesta de `GET /api/medical/profile`. */
export const medicalProfileViewSchema = z.object({
  medical_data: medicalDataSchema.nullish(),
  emergency_access: emergencyAccessViewSchema,
  last_location: lastLocationViewSchema.optional(),
  updated_at: timestampSchema.optional(),
});
export type MedicalProfileView = z.infer<typeof medicalProfileViewSchema>;

/** Respuesta de `POST /api/medical/emergency/enable`. */
export const emergencyEnableResponseSchema = z.object({
  message: z.string(),
  url: z.string(),
});
export type EmergencyEnableResponse = z.infer<typeof emergencyEnableResponseSchema>;

/** Tope del texto que el titular puede imprimir junto a su QR. */
export const EMERGENCY_MAX_CAPTION = 160;

/** Cuerpo de `PUT /api/medical/emergency/caption`. Vacío borra el texto. */
export const emergencyCaptionInputSchema = z.object({
  caption: z.string().max(EMERGENCY_MAX_CAPTION, `Máximo ${EMERGENCY_MAX_CAPTION} caracteres`),
});
export type EmergencyCaptionInput = z.infer<typeof emergencyCaptionInputSchema>;

/** Cuerpo de `PUT /api/medical/location`. La app móvil lo envía periódicamente. */
export const updateLocationInputSchema = z.object({
  lat: z.number().min(-90, 'Latitud fuera de rango').max(90, 'Latitud fuera de rango'),
  lng: z.number().min(-180, 'Longitud fuera de rango').max(180, 'Longitud fuera de rango'),
  accuracy: z.number().nonnegative().optional(),
  recorded_at: timestampSchema.optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

/**
 * Ubicación aproximada deducida de la IP del acceso. La resuelve el backend con
 * una base geo-IP local (DB-IP Lite), nunca con un servicio externo. Todos los
 * campos son opcionales: si la IP es privada o no está en la base, no hay nada
 * que mostrar.
 */
export const accessLogLocationSchema = z.object({
  /** Ciudad o municipio, en el idioma que trae la base (inglés). */
  city: z.string().optional(),
  /** Estado, provincia o región. */
  region: z.string().optional(),
  /** País. */
  country: z.string().optional(),
  /** Código ISO de dos letras del país (p. ej. `MX`), útil para la bandera. */
  country_code: z.string().optional(),
  /** Centroide aproximado, solo para pintar un mapa; no es la posición real. */
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type AccessLogLocation = z.infer<typeof accessLogLocationSchema>;

export const accessLogEntrySchema = z.object({
  id: idSchema,
  user_id: idSchema,
  ip: z.string().optional(),
  user_agent: z.string().optional(),
  /** Ubicación aproximada por IP; ausente si no se pudo resolver. */
  location: accessLogLocationSchema.optional(),
  created_at: timestampSchema,
  expires_at: timestampSchema,
});
export type AccessLogEntry = z.infer<typeof accessLogEntrySchema>;

/**
 * Respuesta de `GET /api/medical/access-log`.
 * Ojo: el backend la envuelve en `access_log`, no es una lista suelta.
 */
export const accessLogResponseSchema = z.object({
  access_log: z.array(accessLogEntrySchema),
});
export type AccessLogResponse = z.infer<typeof accessLogResponseSchema>;

/**
 * Cuerpo de `POST /api/medical/check-in`: la "señal verde" con la que el titular
 * avisa a sus contactos de emergencia de que está bien. Solo funciona con sesión
 * iniciada.
 *
 * La ubicación es opcional y decide el propio usuario: si `include_location` es
 * `false` no se comparte ninguna; si es `true` pero falta `location` (el
 * navegador no dio permiso o no pudo medirla), el backend adjunta la última
 * ubicación registrada del titular, si sigue vigente.
 */
export const checkInInputSchema = z.object({
  include_location: z.boolean(),
  location: geoPointSchema.optional(),
});
export type CheckInInput = z.infer<typeof checkInInputSchema>;

/** De dónde salió la ubicación adjuntada a la señal verde. */
export const checkInLocationSourceSchema = z.enum([
  /** La midió el dispositivo en ese momento. */
  'current',
  /** Se reutilizó la última ubicación sincronizada porque no había una actual. */
  'last_known',
  /** No se adjuntó ninguna ubicación. */
  'none',
]);
export type CheckInLocationSource = z.infer<typeof checkInLocationSourceSchema>;

/** Respuesta de `POST /api/medical/check-in`. */
export const checkInResultSchema = z.object({
  message: z.string(),
  /** Contactos alcanzados por al menos un canal. */
  notified: z.number().int().nonnegative(),
  /** Contactos sin ningún canal exitoso. */
  failed: z.number().int().nonnegative(),
  /** Contactos considerados. */
  total: z.number().int().nonnegative(),
  channels: z.array(z.string()),
  location_source: checkInLocationSourceSchema,
  location: geoPointSchema.optional(),
  /** Cuándo se midió esa ubicación, no cuándo llegó al servidor. */
  recorded_at: timestampSchema.optional(),
});
export type CheckInResult = z.infer<typeof checkInResultSchema>;
