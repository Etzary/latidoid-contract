import { z } from 'zod';
import { timestampSchema } from './common.js';
import { medicalDataSchema } from './medical.js';

/**
 * Respuesta de `GET /api/emergency/:token` (ruta pública, sin sesión).
 * Cuando `degraded` es `true` la suscripción venció y `medical_data` solo trae
 * tipo de sangre, alergias y contactos de emergencia.
 */
export const emergencyInfoSchema = z.object({
  /** Siempre `true`: separa esta rama de `emergencyUnavailableSchema`. */
  available: z.literal(true),
  name: z.string(),
  updated_at: timestampSchema,
  medical_data: medicalDataSchema,
  degraded: z.boolean(),
  message: z.string().optional(),
  /**
   * Aviso legal que acompaña a la ficha ("no es una valoración médica", "los
   * datos los declaró el titular"). Lo redacta el backend para que web y móvil
   * muestren el mismo texto.
   */
  disclaimer: z.string(),
  /** `true` si hay contactos de emergencia a los que avisar. */
  can_alert: z.boolean(),
  /** Canales configurados hoy: `["sms","email","whatsapp"]`. */
  alert_channels: z.array(z.string()).optional(),
});
export type EmergencyInfo = z.infer<typeof emergencyInfoSchema>;

/** Por qué no se puede mostrar la ficha pública. */
export const emergencyUnavailableReasonSchema = z.enum([
  /** El titular la ocultó temporalmente; se republica sola al vencer el plazo. */
  'hidden',
  /** Nunca la publicó o desactivó el acceso; no se republica sola. */
  'disabled',
]);
export type EmergencyUnavailableReason = z.infer<typeof emergencyUnavailableReasonSchema>;

/**
 * Lo que ve quien escanea un QR que no puede mostrar la ficha. Es una respuesta
 * legítima (HTTP 200), no un error 404: el token existe, el titular decidió no
 * publicar sus datos ahora mismo.
 */
export const emergencyUnavailableSchema = z.object({
  available: z.literal(false),
  reason: emergencyUnavailableReasonSchema,
  /** Texto ya redactado para mostrar, sin exponer ningún dato del titular. */
  message: z.string(),
});
export type EmergencyUnavailable = z.infer<typeof emergencyUnavailableSchema>;

/**
 * Respuesta pública del QR: la ficha o el aviso de que no está disponible.
 * Usa `isEmergencyUnavailable` para discriminar sin lanzar.
 */
export const emergencyPublicResponseSchema = z.union([
  emergencyInfoSchema,
  emergencyUnavailableSchema,
]);
export type EmergencyPublicResponse = z.infer<typeof emergencyPublicResponseSchema>;

export const isEmergencyUnavailable = (
  value: EmergencyPublicResponse,
): value is EmergencyUnavailable => value.available === false;

/** Cuerpo **opcional** de `POST /api/emergency/:token/alert`: ubicación de quien escanea. */
export const alertLocationInputSchema = z.object({
  lat: z.number().min(-90, 'Latitud fuera de rango').max(90, 'Latitud fuera de rango'),
  lng: z.number().min(-180, 'Longitud fuera de rango').max(180, 'Longitud fuera de rango'),
  accuracy: z.number().nonnegative().optional(),
});
export type AlertLocationInput = z.infer<typeof alertLocationInputSchema>;

/** Respuesta de `POST /api/emergency/:token/alert`. */
export const emergencyAlertResultSchema = z.object({
  message: z.string(),
  /** Contactos alcanzados por al menos un canal. */
  notified: z.number().int().nonnegative(),
  /** Contactos sin ningún canal exitoso. */
  failed: z.number().int().nonnegative(),
  /** Contactos considerados. */
  total: z.number().int().nonnegative(),
  channels: z.array(z.string()),
});
export type EmergencyAlertResult = z.infer<typeof emergencyAlertResultSchema>;
