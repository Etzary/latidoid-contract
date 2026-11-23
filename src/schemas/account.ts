import { z } from 'zod';
import { timestampSchema } from './common.js';

/** Marca del archivo de exportación, para que se reconozca al reabrirse. */
export const ACCOUNT_EXPORT_FORMAT = 'latidoid.account-export';

/** Versión del formato de exportación. Sube si cambia la estructura. */
export const ACCOUNT_EXPORT_VERSION = 1;

/**
 * Respuesta de `GET /api/auth/account/export`: todo lo que la cuenta guarda
 * sobre el titular, con la ficha médica ya descifrada, para que pueda
 * llevárselo (derechos de acceso y portabilidad).
 *
 * Las secciones van como objetos sueltos a propósito: el contrato fija el
 * envoltorio, no la forma interna de cada colección, que puede evolucionar sin
 * romper a quien descarga el archivo.
 */
export const accountExportSchema = z.object({
  format: z.literal(ACCOUNT_EXPORT_FORMAT),
  format_version: z.literal(ACCOUNT_EXPORT_VERSION),
  exported_at: timestampSchema,
  /** Datos de la cuenta, sin contraseña, tokens ni secretos. */
  account: z.record(z.string(), z.unknown()),
  /** Ficha médica descifrada, o `null` si nunca se capturó. */
  medical_profile: z.record(z.string(), z.unknown()).nullable(),
  /** Historial de accesos al QR. */
  access_log: z.array(z.record(z.string(), z.unknown())),
  /** Alertas de emergencia enviadas. */
  alerts: z.array(z.record(z.string(), z.unknown())),
  /** Señales verdes enviadas. */
  check_ins: z.array(z.record(z.string(), z.unknown())),
  /** Mascotas registradas. */
  pets: z.array(z.record(z.string(), z.unknown())),
  /** Mensajes de retroalimentación enviados. */
  feedback: z.array(z.record(z.string(), z.unknown())),
  /** Suscripciones contratadas. */
  subscriptions: z.array(z.record(z.string(), z.unknown())),
  /** Eventos de pago recibidos de las pasarelas. */
  payments: z.array(z.record(z.string(), z.unknown())),
});
export type AccountExport = z.infer<typeof accountExportSchema>;
