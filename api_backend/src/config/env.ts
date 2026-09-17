import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  GEMINI_TTS_MODEL: z.string().default('gemini-2.5-flash-preview-tts'),
  TIER_BASIC_MINUTES: z.coerce.number().default(30),
  TIER_BASIC_QUESTIONS: z.coerce.number().default(100),
  TIER_PRO_MINUTES: z.coerce.number().default(50),
  TIER_PRO_QUESTIONS: z.coerce.number().default(300),
  TIER_LIMITLESS_MINUTES: z.coerce.number().default(-1),
  TIER_LIMITLESS_QUESTIONS: z.coerce.number().default(-1),
  VAKIFPAYS_API_URL: z
    .string()
    .default('https://testpos.vakifpays.com.tr/vakifpays/api/v2'),
  VAKIFPAYS_PAYMENT_BASE_URL: z
    .string()
    .default('https://testpos.vakifpays.com.tr/payment'),
  VAKIFPAYS_MERCHANT_USER: z.string().optional(),
  VAKIFPAYS_MERCHANT_PASSWORD: z.string().optional(),
  VAKIFPAYS_MERCHANT_CODE: z.string().optional(),
  VAKIFPAYS_RETURN_URL: z.string().url().optional(),
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:5173'),
  /** Virgülle ayrılmış ek origin’ler (Flutter web / marketing). */
  CORS_ORIGINS: z.string().optional(),
  BILLING_GATE_ENABLED: z.enum(['true', 'false']).optional(),
  ALLOW_HEADER_AUTH: z.enum(['true', 'false']).optional(),
  PARENT_REPORT_CRON: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  PARENT_REPORT_INTERVAL_MS: z.coerce.number().default(86_400_000),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
  SMS_API_URL: z.string().optional(),
  SMS_API_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[config] invalid env', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const data = parsed.data;
const isProd = data.NODE_ENV === 'production';

/** Prod’da varsayılan: kapalı. Dev’de açık (X-User-Id demo). */
const allowHeaderAuth =
  data.ALLOW_HEADER_AUTH !== undefined
    ? data.ALLOW_HEADER_AUTH === 'true'
    : !isProd;

/** Prod’da varsayılan: açık (deneme süresi). Dev’de kapalı. */
const billingGateEnabled =
  data.BILLING_GATE_ENABLED !== undefined
    ? data.BILLING_GATE_ENABLED === 'true'
    : isProd;

function parseCorsOrigins(): string[] {
  const fromList = (data.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set<string>(fromList);
  if (data.PUBLIC_WEB_URL) set.add(data.PUBLIC_WEB_URL);
  return [...set];
}

export const env = {
  port: data.PORT,
  nodeEnv: data.NODE_ENV,
  isProd,
  supabaseUrl: data.SUPABASE_URL,
  supabaseAnonKey: data.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY,
  geminiApiKey: data.GEMINI_API_KEY,
  geminiModel: data.GEMINI_MODEL,
  geminiTtsModel: data.GEMINI_TTS_MODEL,
  tierLimits: {
    basic: {
      dailyMinutes: data.TIER_BASIC_MINUTES,
      monthlyQuestions: data.TIER_BASIC_QUESTIONS,
    },
    pro: {
      dailyMinutes: data.TIER_PRO_MINUTES,
      monthlyQuestions: data.TIER_PRO_QUESTIONS,
    },
    limitless: {
      dailyMinutes: data.TIER_LIMITLESS_MINUTES,
      monthlyQuestions: data.TIER_LIMITLESS_QUESTIONS,
    },
  },
  vakifpays: {
    apiUrl: data.VAKIFPAYS_API_URL,
    paymentBaseUrl: data.VAKIFPAYS_PAYMENT_BASE_URL,
    merchantUser: data.VAKIFPAYS_MERCHANT_USER,
    merchantPassword: data.VAKIFPAYS_MERCHANT_PASSWORD,
    merchantCode: data.VAKIFPAYS_MERCHANT_CODE,
    returnUrl: data.VAKIFPAYS_RETURN_URL,
  },
  publicWebUrl: data.PUBLIC_WEB_URL,
  corsOrigins: parseCorsOrigins(),
  billingGateEnabled,
  allowHeaderAuth,
  parentReportCron: data.PARENT_REPORT_CRON,
  parentReportIntervalMs: data.PARENT_REPORT_INTERVAL_MS,
  whatsappApiUrl: data.WHATSAPP_API_URL,
  whatsappApiToken: data.WHATSAPP_API_TOKEN,
  smsApiUrl: data.SMS_API_URL,
  smsApiToken: data.SMS_API_TOKEN,
};
