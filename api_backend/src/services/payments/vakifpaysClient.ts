import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * VakıfPayS API v2 — Web Hosted Payment Page (HPP) flow.
 * Docs: https://pos.vakifpays.com.tr/vakifpays/api/v2/doc
 *
 * 1) SESSIONTOKEN (POST form)
 * 2) Redirect user to {paymentBaseUrl}/{SECURE_SESSION_TOKEN}
 * 3) RETURNURL receives form POST → verify + activate subscription
 */
export type SessionTokenInput = {
  amountTry: number;
  merchantPaymentId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIp?: string;
  returnUrl: string;
  productName: string;
};

export type SessionTokenResult = {
  sessionToken: string;
  paymentPageUrl: string;
  raw: Record<string, unknown>;
};

function assertConfigured() {
  if (
    !env.vakifpays.merchantUser ||
    !env.vakifpays.merchantPassword ||
    !env.vakifpays.merchantCode
  ) {
    throw new AppError(
      503,
      'VakıfPayS credentials missing (VAKIFPAYS_MERCHANT_*)',
      'VAKIFPAYS_NOT_CONFIGURED',
    );
  }
}

function formatAmount(amountTry: number): string {
  return amountTry.toFixed(2);
}

async function postForm(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(env.vakifpays.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  // API may return querystring-like or JSON depending on gateway version
  let parsed: Record<string, unknown> = {};
  try {
    if (text.trim().startsWith('{')) {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } else {
      const qs = new URLSearchParams(text.includes('=') ? text : '');
      qs.forEach((v, k) => {
        parsed[k] = v;
      });
      if (Object.keys(parsed).length === 0) {
        parsed = { raw: text };
      }
    }
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new AppError(
      502,
      `VakıfPayS HTTP ${res.status}`,
      'VAKIFPAYS_HTTP_ERROR',
    );
  }

  if (parsed.ERROR || parsed.error) {
    throw new AppError(
      502,
      String(parsed.ERRORTEXT ?? parsed.ERROR ?? parsed.error),
      String(parsed.ERRORCODE ?? 'VAKIFPAYS_ERROR'),
    );
  }

  return parsed;
}

export async function createPaymentSession(
  input: SessionTokenInput,
): Promise<SessionTokenResult> {
  assertConfigured();

  const raw = await postForm({
    ACTION: 'SESSIONTOKEN',
    MERCHANTUSER: env.vakifpays.merchantUser!,
    MERCHANTPASSWORD: env.vakifpays.merchantPassword!,
    MERCHANT: env.vakifpays.merchantCode!,
    AMOUNT: formatAmount(input.amountTry),
    CURRENCY: 'TRY',
    MERCHANTPAYMENTID: input.merchantPaymentId,
    RETURNURL: input.returnUrl,
    CUSTOMER: input.customerId,
    CUSTOMERNAME: input.customerName,
    CUSTOMEREMAIL: input.customerEmail,
    CUSTOMERPHONE: input.customerPhone,
    CUSTOMERIP: input.customerIp ?? '127.0.0.1',
    SESSIONTYPE: 'PAYMENTSESSION',
    ORDERITEMS: JSON.stringify([
      {
        productCode: input.merchantPaymentId,
        name: input.productName,
        description: input.productName,
        quantity: 1,
        amount: formatAmount(input.amountTry),
      },
    ]),
  });

  const sessionToken = String(
    raw.SESSIONTOKEN ??
      raw.sessionToken ??
      raw.SECURE_SESSION_TOKEN ??
      raw.secureSessionToken ??
      '',
  );

  if (!sessionToken) {
    throw new AppError(
      502,
      'VakıfPayS SESSIONTOKEN alınamadı',
      'VAKIFPAYS_NO_TOKEN',
    );
  }

  const base = env.vakifpays.paymentBaseUrl.replace(/\/$/, '');
  return {
    sessionToken,
    paymentPageUrl: `${base}/${sessionToken}`,
    raw,
  };
}

export function isCallbackSuccess(payload: Record<string, string>): boolean {
  const code =
    payload.RESPONSECODE ??
    payload.PGTRANRESPONSECODE ??
    payload.responseCode ??
    '';
  const status = (payload.STATUS ?? payload.status ?? '').toUpperCase();
  return code === '00' || status === 'PAID' || status === 'SUCCESS';
}
