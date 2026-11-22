import { z } from 'zod';
import {
  emailSchema,
  emptyToUndefined,
  idSchema,
  timestampSchema,
  verificationCodeSchema,
} from './common.js';

/**
 * Política de contraseña, idéntica a `utils.IsStrongPassword` del backend:
 * mínimo 8 caracteres con al menos una mayúscula, una minúscula, un número y un símbolo.
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un símbolo');

export const twoFactorMethodSchema = z.enum(['email', 'sms']);
export type TwoFactorMethod = z.infer<typeof twoFactorMethodSchema>;

/** Usuario tal como lo devuelve el backend. La contraseña nunca llega al cliente. */
export const userSchema = z.object({
  id: idSchema,
  email: emailSchema,
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  is_email_verified: z.boolean(),
  is_phone_verified: z.boolean(),
  is_2fa_enabled: z.boolean(),
  two_factor_method: twoFactorMethodSchema.optional(),
  provider: z.string().optional(),
  /** Presente cuando la cuenta tiene una identidad de Google vinculada. */
  google_id: z.string().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type User = z.infer<typeof userSchema>;

/**
 * Versiones vigentes de los documentos legales. Se publican aquí para que web y
 * móvil pidan el consentimiento sobre el mismo texto y para que el backend
 * guarde *qué* versión aceptó el usuario, no solo cuándo.
 * Al publicar una versión nueva, súbelas: el aviso de "documentos actualizados"
 * y la vuelta a pedir el consentimiento se apoyan en este número.
 */
export const LEGAL_TERMS_VERSION = '1.0';
export const LEGAL_PRIVACY_VERSION = '1.0';

/**
 * Consentimiento informado que se exige al crear la cuenta. Los tres booleanos
 * deben venir en `true`: el backend guarda la versión aceptada junto con la
 * fecha y la IP desde donde se aceptó, para poder demostrarlo después.
 *
 * `accept_medical_data` es el consentimiento explícito para tratar datos
 * personales sensibles (salud), que la ley exige por separado del aviso general.
 */
export const legalConsentSchema = z.object({
  accept_terms: z
    .boolean()
    .refine((value) => value, { message: 'Debes aceptar los Términos y Condiciones' }),
  accept_privacy: z
    .boolean()
    .refine((value) => value, { message: 'Debes aceptar el Aviso de Privacidad' }),
  accept_medical_data: z.boolean().refine((value) => value, {
    message: 'Debes autorizar el tratamiento de tus datos personales sensibles',
  }),
  terms_version: z.string().min(1),
  privacy_version: z.string().min(1),
});
export type LegalConsent = z.infer<typeof legalConsentSchema>;

export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  /** Consentimiento informado. Obligatorio para crear la cuenta. */
  consent: legalConsentSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const registerResponseSchema = z.object({
  message: z.string(),
  user: userSchema,
});
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/** Sesión autenticada: el backend devuelve el JWT y el usuario. */
export const authSessionSchema = z.object({
  message: z.string(),
  token: z.string().min(1),
  user: userSchema,
  /**
   * Clave con la que el cliente firma cada petición (HMAC). El backend solo la
   * envía si tiene activada la firma de peticiones; sin ella las peticiones de
   * la app viajan sin firmar.
   */
  signing_key: z.string().optional(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

/** El login pide el segundo factor cuando el usuario lo tiene activado. */
export const loginRequires2faSchema = z.object({
  requires_2fa: z.literal(true),
  message: z.string(),
  email: emailSchema,
});
export type LoginRequires2fa = z.infer<typeof loginRequires2faSchema>;

/**
 * `/login` responde de dos formas: sesión completa o petición del código 2FA.
 * Usa `isLoginRequires2fa` para discriminar sin lanzar.
 */
export const loginResponseSchema = z.union([authSessionSchema, loginRequires2faSchema]);
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const isLoginRequires2fa = (value: LoginResponse): value is LoginRequires2fa =>
  'requires_2fa' in value && value.requires_2fa === true;

export const verify2faInputSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
});
export type Verify2faInput = z.infer<typeof verify2faInputSchema>;

export const googleInputSchema = z.object({ id_token: z.string().min(1) });
export type GoogleInput = z.infer<typeof googleInputSchema>;

/**
 * `google/link` vincula una cuenta de Google a la sesión ya autenticada. Reusa
 * el mismo `id_token` del login y devuelve el usuario actualizado.
 */
export const googleLinkResponseSchema = z.object({
  message: z.string(),
  user: userSchema,
});
export type GoogleLinkResponse = z.infer<typeof googleLinkResponseSchema>;

export const verifyCodeInputSchema = z.object({ code: verificationCodeSchema });
export type VerifyCodeInput = z.infer<typeof verifyCodeInputSchema>;

/** `verify-email` y `verify-phone` devuelven un token nuevo con los claims actualizados. */
export const verifyCodeResponseSchema = z.object({
  message: z.string(),
  token: z.string().min(1),
});
export type VerifyCodeResponse = z.infer<typeof verifyCodeResponseSchema>;

export const changePasswordInputSchema = z.object({
  current_password: z.string().min(1, 'La contraseña actual es obligatoria'),
  new_password: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

/**
 * Configuración de 2FA. Al desactivarla, `two_factor_method` puede venir vacío;
 * al activarla por SMS, el teléfono pasa a ser obligatorio.
 */
export const configure2faInputSchema = z
  .object({
    is_2fa_enabled: z.boolean(),
    two_factor_method: z.union([twoFactorMethodSchema, z.literal('')]),
    phone: z.string(),
    password: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine(
    (value) => !(value.is_2fa_enabled && value.two_factor_method === 'sms') || value.phone.trim() !== '',
    { message: 'Indica un teléfono para el 2FA por SMS', path: ['phone'] },
  );
export type Configure2faInput = z.infer<typeof configure2faInputSchema>;

/**
 * Cuerpo de `DELETE /api/auth/account`: elimina la cuenta y sus datos. Exige la
 * contraseña (para que nadie la borre desde una sesión abierta ajena) y una
 * confirmación explícita. `reason` es opcional y solo alimenta la analítica de
 * bajas; no se muestra a nadie.
 */
export const deleteAccountInputSchema = z.object({
  password: z.string().min(1, 'Confirma tu contraseña'),
  confirm: z
    .boolean()
    .refine((value) => value, { message: 'Debes confirmar que quieres eliminar tu cuenta' }),
  reason: emptyToUndefined(z.string().max(500, 'Máximo 500 caracteres')),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
