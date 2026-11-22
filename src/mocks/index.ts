import { HttpResponse, http, type RequestHandler } from 'msw';
import type { AccountExport } from '../schemas/account.js';
import type { AuthSession, User } from '../schemas/auth.js';
import type {
  EmergencyAlertResult,
  EmergencyInfo,
  EmergencyUnavailable,
} from '../schemas/emergency.js';
import type {
  AccessLogEntry,
  CheckInResult,
  EmergencyVisibilityResponse,
  MedicalData,
  MedicalProfileView,
} from '../schemas/medical.js';
import type {
  AnalyticsOverview,
  MedicalAnalytics,
  OpsGrant,
  OpsGrantResponse,
  OpsPet,
  OpsPlanUpdateResponse,
  OpsPlansResponse,
  OpsPetsResponse,
  OpsResyncResponse,
  OpsSession,
  PetAnalytics,
  SubscriptionAnalytics,
} from '../schemas/ops.js';
import type { Plan, SubscribeOutcome, SubscriptionView } from '../schemas/subscription.js';

/** Estado en memoria que respaldan los handlers; se puede precargar o mutar en los tests. */
export type MockState = {
  user: User;
  token: string;
  requires2fa: boolean;
  medicalData: MedicalData;
  emergencyEnabled: boolean;
  /** Si trae fecha, la ficha está oculta hasta entonces (modo discreto). */
  emergencyHiddenUntil: string | null;
  emergencyToken: string;
  emergencyBaseUrl: string;
  accessLog: AccessLogEntry[];
  plans: Plan[];
  providers: string[];
  subscription: SubscriptionView | null;
  /** Señales verdes enviadas hoy, para la analítica médica. */
  checkIns24h: number;
  /** Operador de la consola de administración. */
  opsGrant: OpsGrant;
  /** Token (ficticio) de la sesión de la consola de administración. */
  opsToken: string;
};

const now = () => new Date().toISOString();

export function createMockState(overrides: Partial<MockState> = {}): MockState {
  const timestamp = now();

  const user: User = {
    id: '665f00000000000000000001',
    email: 'ana@example.com',
    first_name: 'Ana',
    last_name: 'García',
    phone: '+525512345678',
    is_email_verified: true,
    is_phone_verified: false,
    is_2fa_enabled: false,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const medicalData: MedicalData = {
    blood_type: 'O+',
    date_of_birth: '1990-04-12',
    allergies: ['Penicilina'],
    chronic_conditions: ['Asma'],
    medications: [{ name: 'Salbutamol', dose: '100 µg', frequency: 'Según necesidad' }],
    emergency_contacts: [
      {
        name: 'Luis García',
        relationship: 'Hermano',
        phone: '+525587654321',
        email: 'luis@example.com',
      },
    ],
    share_address: false,
  };

  return {
    user,
    token: 'mock.jwt.token',
    requires2fa: false,
    medicalData,
    emergencyEnabled: true,
    emergencyHiddenUntil: null,
    emergencyToken: 'mock-emergency-token',
    emergencyBaseUrl: 'http://localhost:3000/e',
    accessLog: [
      {
        id: '665f00000000000000000010',
        user_id: user.id,
        ip: '203.0.113.10',
        user_agent: 'Mozilla/5.0 (iPhone)',
        created_at: timestamp,
        expires_at: timestamp,
      },
    ],
    plans: [
      {
        code: 'monthly',
        name: 'Mensual',
        amount: 99,
        currency: 'MXN',
        interval_months: 1,
        active: true,
      },
      {
        code: 'annual',
        name: 'Anual',
        amount: 899,
        currency: 'MXN',
        interval_months: 12,
        active: true,
      },
    ],
    providers: ['mercadopago', 'openpay'],
    subscription: {
      provider: 'mercadopago',
      plan_code: 'monthly',
      plan_name: 'Mensual',
      status: 'active',
      active: true,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      available_providers: ['mercadopago', 'openpay'],
    },
    checkIns24h: 3,
    opsGrant: {
      email: 'ops@example.com',
      name: 'Operaciones',
      role: 'owner',
    },
    opsToken: 'mock.ops.jwt.token',
    ...overrides,
  };
}

export type MockHandlersOptions = {
  /** Base URL del backend, sin barra final. Debe coincidir con la del cliente. */
  baseUrl: string;
  state?: MockState;
};

const session = (state: MockState): AuthSession => ({
  message: 'Inicio de sesión exitoso',
  token: state.token,
  user: state.user,
});

/**
 * Handlers de MSW derivados del contrato. Reutilizables por web y mobile para
 * desarrollar y testear sin el backend levantado.
 */
export function createMockHandlers({ baseUrl, state = createMockState() }: MockHandlersOptions): RequestHandler[] {
  const url = (path: string) => `${baseUrl.replace(/\/+$/, '')}${path}`;

  return [
    http.get(url('/ping'), () => HttpResponse.json({ message: 'pong' })),

    // --- Autenticación ---
    http.post(url('/api/auth/register'), () =>
      HttpResponse.json({ message: '¡Usuario registrado con éxito!', user: state.user }, { status: 201 }),
    ),
    http.post(url('/api/auth/login'), () =>
      state.requires2fa
        ? HttpResponse.json({
            requires_2fa: true,
            message: 'Se envió un código a tu correo',
            email: state.user.email,
          })
        : HttpResponse.json(session(state)),
    ),
    http.post(url('/api/auth/verify-2fa'), () => HttpResponse.json(session(state))),
    http.post(url('/api/auth/google'), () =>
      HttpResponse.json({ ...session(state), message: '¡Inicio de sesión con Google exitoso!' }),
    ),
    http.post(url('/api/auth/google/link'), () =>
      HttpResponse.json({
        message: '¡Cuenta de Google vinculada exitosamente!',
        user: { ...state.user, google_id: 'mock-google-id' },
      }),
    ),
    http.post(url('/api/auth/logout'), () => HttpResponse.json({ message: 'Sesión cerrada exitosamente' })),
    http.get(url('/api/auth/account/export'), () => {
      const exported: AccountExport = {
        format: 'geo-intelligence.account-export',
        format_version: 1,
        exported_at: now(),
        account: { email: state.user.email, first_name: state.user.first_name },
        medical_profile: { ...state.medicalData },
        access_log: state.accessLog.map((entry) => ({ ...entry })),
        alerts: [],
        check_ins: [],
        pets: [],
        feedback: [],
        subscriptions: state.subscription ? [{ ...state.subscription }] : [],
        payments: [],
      };
      return HttpResponse.json(exported);
    }),
    http.delete(url('/api/auth/account'), () =>
      HttpResponse.json({ message: 'Tu cuenta y tus datos se eliminaron.' }),
    ),
    http.post(url('/api/auth/verify-email'), () =>
      HttpResponse.json({ message: '¡Correo verificado exitosamente!', token: state.token }),
    ),
    http.post(url('/api/auth/verify-phone'), () =>
      HttpResponse.json({ message: '¡Teléfono verificado exitosamente!', token: state.token }),
    ),
    http.post(url('/api/auth/send-verification-email'), () =>
      HttpResponse.json({ message: 'Se ha enviado un nuevo código de verificación a tu correo.' }),
    ),
    http.post(url('/api/auth/send-verification-phone'), () =>
      HttpResponse.json({ message: 'Se ha enviado un nuevo código de verificación a tu teléfono.' }),
    ),
    http.patch(url('/api/auth/password'), () =>
      HttpResponse.json({ message: 'Contraseña actualizada correctamente. Inicia sesión nuevamente.' }),
    ),
    http.patch(url('/api/auth/2fa/configure'), () =>
      HttpResponse.json({ message: 'Autenticación de doble factor (2FA) actualizada exitosamente.' }),
    ),

    // --- Ficha médica ---
    http.get(url('/api/medical/profile'), () =>
      HttpResponse.json({
        medical_data: state.medicalData,
        emergency_access: {
          enabled: state.emergencyEnabled,
          url: state.emergencyEnabled ? emergencyUrl(state) : undefined,
          hidden_until: activeHiddenUntil(state) ?? undefined,
        },
        updated_at: now(),
      } satisfies MedicalProfileView),
    ),
    http.put(url('/api/medical/emergency/visibility'), async ({ request }) => {
      const body = (await request.json()) as { hidden?: boolean; hours?: number };
      if (body.hidden) {
        state.emergencyHiddenUntil = new Date(
          Date.now() + (body.hours ?? 24) * 60 * 60 * 1000,
        ).toISOString();
      } else {
        state.emergencyHiddenUntil = null;
      }

      const response: EmergencyVisibilityResponse = {
        message: body.hidden
          ? 'Tu ficha quedó oculta temporalmente y se publicará sola al cumplirse el plazo.'
          : 'Tu ficha vuelve a estar visible para quien escanee tu QR.',
        enabled: !body.hidden,
        hidden_until: state.emergencyHiddenUntil ?? undefined,
      };
      return HttpResponse.json(response);
    }),
    http.put(url('/api/medical/profile'), async ({ request }) => {
      state.medicalData = (await request.json()) as MedicalData;
      return HttpResponse.json({ message: 'Información médica guardada correctamente' });
    }),
    http.put(url('/api/medical/location'), () => HttpResponse.json({ message: 'Ubicación registrada' })),
    http.post(url('/api/medical/emergency/enable'), () => {
      if (!state.subscription?.active) {
        return HttpResponse.json(
          { error: 'necesitas una suscripción activa para publicar tu QR' },
          { status: 402 },
        );
      }
      state.emergencyEnabled = true;
      return HttpResponse.json({
        message: 'Acceso de emergencia activado. Codifica esta URL en el QR.',
        url: emergencyUrl(state),
      });
    }),
    http.post(url('/api/medical/emergency/disable'), () => {
      state.emergencyEnabled = false;
      return HttpResponse.json({ message: 'Acceso de emergencia desactivado' });
    }),
    http.get(url('/api/medical/access-log'), () => HttpResponse.json({ access_log: state.accessLog })),
    http.post(url('/api/medical/check-in'), async ({ request }) => {
      const body = (await request.json()) as { include_location?: boolean; location?: unknown };
      const contacts = state.medicalData.emergency_contacts ?? [];
      if (contacts.length === 0) {
        return HttpResponse.json(
          { error: 'este perfil no tiene contactos de emergencia registrados' },
          { status: 400 },
        );
      }

      const includeLocation = body.include_location ?? false;
      const currentLocation =
        body.location as CheckInResult['location'] | undefined;

      const result: CheckInResult = {
        message: `Avisamos a ${contacts.length} contacto(s) de que estás bien.`,
        notified: contacts.length,
        failed: 0,
        total: contacts.length,
        channels: ['sms', 'email'],
        location_source: includeLocation ? (currentLocation ? 'current' : 'last_known') : 'none',
        location: includeLocation ? (currentLocation ?? LAST_KNOWN_LOCATION) : undefined,
        recorded_at: includeLocation
          ? (currentLocation ? now() : new Date(Date.now() - 30 * 60 * 1000).toISOString())
          : undefined,
      };
      state.checkIns24h += 1;

      return HttpResponse.json(result);
    }),

    // --- Suscripciones ---
    http.get(url('/api/subscriptions/plans'), () =>
      HttpResponse.json({ plans: state.plans, providers: state.providers }),
    ),
    http.get(url('/api/subscriptions/me'), () =>
      state.subscription
        ? HttpResponse.json(state.subscription)
        : HttpResponse.json({ status: 'expired', active: false, available_providers: state.providers }),
    ),
    http.post(url('/api/subscriptions/subscribe'), async ({ request }) => {
      if (state.subscription?.active) {
        return HttpResponse.json({ error: 'ya tienes una suscripción activa' }, { status: 409 });
      }
      const body = (await request.json()) as { plan_code?: string; provider?: string };
      const outcome: SubscribeOutcome = {
        message: 'Suscripción iniciada; el acceso se activa al confirmarse el pago',
        provider: body.provider ?? 'mercadopago',
        status: 'pending',
        redirect_url:
          body.provider === 'openpay' ? undefined : 'https://www.mercadopago.com.mx/checkout/mock',
      };
      return HttpResponse.json(outcome);
    }),
    http.post(url('/api/subscriptions/cancel'), () =>
      state.subscription
        ? HttpResponse.json({ message: 'Suscripción cancelada correctamente' })
        : HttpResponse.json({ error: 'no tienes una suscripción' }, { status: 404 }),
    ),
    http.post(url('/api/subscriptions/resync'), () =>
      state.subscription
        ? HttpResponse.json(state.subscription)
        : HttpResponse.json({ error: 'no tienes una suscripción' }, { status: 404 }),
    ),

    // --- Rutas públicas de emergencia ---
    http.get(url('/api/emergency/:token'), ({ params }) => {
      if (params.token !== state.emergencyToken) {
        return HttpResponse.json({ error: 'enlace de emergencia no válido' }, { status: 404 });
      }

      const hiddenUntil = activeHiddenUntil(state);
      if (!state.emergencyEnabled || hiddenUntil) {
        const unavailable: EmergencyUnavailable = {
          available: false,
          reason: state.emergencyEnabled ? 'hidden' : 'disabled',
          message: state.emergencyEnabled
            ? 'El titular ocultó temporalmente su información médica.'
            : 'El titular no tiene publicada su información médica.',
        };
        return HttpResponse.json(unavailable);
      }

      const info: EmergencyInfo = {
        available: true,
        name: `${state.user.first_name} ${state.user.last_name}`.trim(),
        updated_at: now(),
        medical_data: state.medicalData,
        degraded: false,
        disclaimer:
          'Estos datos los declaró el titular y no sustituyen una valoración médica. En una emergencia llama al 911.',
        can_alert: (state.medicalData.emergency_contacts ?? []).length > 0,
        alert_channels: ['sms', 'email'],
      };
      return HttpResponse.json(info);
    }),
    http.post(url('/api/emergency/:token/alert'), () => {
      const contacts = state.medicalData.emergency_contacts ?? [];
      if (contacts.length === 0) {
        return HttpResponse.json(
          { error: 'este perfil no tiene contactos de emergencia registrados' },
          { status: 400 },
        );
      }
      const result: EmergencyAlertResult = {
        message: `Se avisó a ${contacts.length} contacto(s) de emergencia.`,
        notified: contacts.length,
        failed: 0,
        total: contacts.length,
        channels: ['sms', 'email'],
      };
      return HttpResponse.json(result);
    }),

    // --- Consola de operaciones (solo web, inicio de sesión aparte) ---
    http.post(url('/api/ops/auth/login'), () => {
      const session: OpsSession = {
        message: 'Sesión iniciada',
        token: state.opsToken,
        grant: state.opsGrant,
      };
      return HttpResponse.json(session);
    }),
    http.post(url('/api/ops/auth/logout'), () => HttpResponse.json({ message: 'Sesión cerrada' })),
    http.get(url('/api/ops/auth/me'), () => {
      const response: OpsGrantResponse = { message: 'Sesión vigente', grant: state.opsGrant };
      return HttpResponse.json(response);
    }),
    http.get(url('/api/ops/analytics/overview'), () => {
      const overview: AnalyticsOverview = {
        generated_at: now(),
        providers: state.providers,
        users: {
          total: 128,
          email_verified: 96,
          phone_verified: 54,
          two_factor_users: 21,
        },
        medical: medicalAnalytics(state),
        pets: petAnalytics(),
        subscriptions: subscriptionAnalytics(state),
      };
      return HttpResponse.json(overview);
    }),
    http.get(url('/api/ops/analytics/subscriptions'), () =>
      HttpResponse.json(subscriptionAnalytics(state)),
    ),
    http.get(url('/api/ops/analytics/medical'), () => HttpResponse.json(medicalAnalytics(state))),
    http.get(url('/api/ops/analytics/pets'), () => HttpResponse.json(petAnalytics())),
    http.get(url('/api/ops/pets'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const email = (params.get('email') ?? '').trim().toLowerCase();
      const page = Math.max(1, Number(params.get('page')) || 1);
      const limit = Math.max(1, Number(params.get('limit')) || 20);

      const filtered = email
        ? MOCK_OPS_PETS.filter((pet) => pet.user_email.toLowerCase() === email)
        : MOCK_OPS_PETS;
      const start = (page - 1) * limit;

      const response: OpsPetsResponse = {
        items: filtered.slice(start, start + limit),
        total: filtered.length,
        page,
        limit,
      };
      return HttpResponse.json(response);
    }),
    http.get(url('/api/ops/plans'), () => {
      const response: OpsPlansResponse = { plans: state.plans };
      return HttpResponse.json(response);
    }),
    http.patch(url('/api/ops/plans/:code'), async ({ params, request }) => {
      const body = (await request.json()) as Partial<Plan>;
      const existing = state.plans.find((plan) => plan.code === params.code);
      if (!existing) {
        return HttpResponse.json({ error: 'plan no encontrado' }, { status: 404 });
      }

      const updated: Plan = {
        ...existing,
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        amount: body.amount ?? existing.amount,
        currency: body.currency ?? existing.currency,
        interval_months: body.interval_months ?? existing.interval_months,
        active: body.active ?? existing.active,
      };
      state.plans = state.plans.map((plan) => (plan.code === updated.code ? updated : plan));

      const response: OpsPlanUpdateResponse = {
        message: 'Plan actualizado correctamente',
        plan: updated,
      };
      return HttpResponse.json(response);
    }),
    http.post(url('/api/ops/subscriptions/resync'), () => {
      if (!state.subscription) {
        return HttpResponse.json({ error: 'este usuario no tiene suscripción' }, { status: 404 });
      }
      const response: OpsResyncResponse = {
        message: 'Sincronización completada',
        subscription: state.subscription,
      };
      return HttpResponse.json(response);
    }),
  ];
}

/** Última ubicación conocida que usa el mock cuando no llega una actual. */
const LAST_KNOWN_LOCATION = { lat: 19.432608, lng: -99.133209, accuracy: 25 };

function medicalAnalytics(state: MockState): MedicalAnalytics {
  return {
    profiles: 64,
    emergency_enabled: state.emergencyEnabled ? 41 : 40,
    access_logs_24h: state.accessLog.length,
    check_ins_24h: state.checkIns24h,
  };
}

function subscriptionAnalytics(state: MockState): SubscriptionAnalytics {
  const active = state.subscription?.active ? 1 : 0;

  return {
    total: 37,
    active: active + 30,
    pending: 3,
    paused: 1,
    cancelled: 2,
    expired: 1,
    payment_events_24h: 12,
    needs_reconciliation: 2,
    estimated_monthly_revenue: 2970,
    by_provider: state.providers.map((provider) => ({ key: provider, count: 18 })),
    by_plan: state.plans.map((plan) => ({ key: plan.code, count: 12 })),
  };
}

/** Mascotas ficticias que sirve el listado de la consola en los mocks. */
const MOCK_OPS_PETS: OpsPet[] = [
  {
    id: '665f00000000000000000011',
    user_id: '665f00000000000000000001',
    user_email: 'ana@example.com',
    name: 'Luna',
    emergency_enabled: true,
    created_at: '2026-10-02T15:04:05.000Z',
  },
  {
    id: '665f00000000000000000012',
    user_id: '665f00000000000000000001',
    user_email: 'ana@example.com',
    name: 'Rocky',
    emergency_enabled: false,
    created_at: '2026-10-18T09:30:00.000Z',
  },
];

function petAnalytics(): PetAnalytics {
  return {
    pets: MOCK_OPS_PETS.length,
    emergency_enabled: MOCK_OPS_PETS.filter((pet) => pet.emergency_enabled).length,
    owners: new Set(MOCK_OPS_PETS.map((pet) => pet.user_id)).size,
  };
}

function emergencyUrl(state: MockState): string {
  return `${state.emergencyBaseUrl.replace(/\/+$/, '')}/${state.emergencyToken}`;
}

/** Fecha de ocultamiento solo si sigue vigente; al vencer la ficha se publica sola. */
function activeHiddenUntil(state: MockState): string | null {
  if (!state.emergencyHiddenUntil) return null;
  return Date.parse(state.emergencyHiddenUntil) > Date.now() ? state.emergencyHiddenUntil : null;
}
