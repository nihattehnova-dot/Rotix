import { randomUUID } from 'node:crypto';
import {
  getPlanBySku,
  PAYMENT_CHANNEL,
  PAYMENT_PROVIDER,
  type PlanOffer,
} from '../../config/pricing.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { DbUser } from '../../types/domain.js';
import { getSupabaseAdmin } from '../supabase.js';
import {
  createPaymentSession,
  isCallbackSuccess,
} from './vakifpaysClient.js';

function addPeriod(from: Date, period: 'monthly' | 'annual'): Date {
  const d = new Date(from);
  if (period === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
  return d;
}

export async function startCheckout(input: {
  user: DbUser;
  sku: string;
  customerEmail: string;
  customerPhone: string;
  customerIp?: string;
  buyerName?: string;
  buyerTaxId?: string;
}) {
  const plan = getPlanBySku(input.sku);
  if (!plan) {
    throw new AppError(400, 'Geçersiz paket SKU', 'INVALID_SKU');
  }

  const merchantOrderId = `SO-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const returnUrl =
    env.vakifpays.returnUrl ??
    `${env.publicWebUrl.replace(/\/$/, '')}/api/payments/vakifpays/callback`;

  const { data: payment, error } = await getSupabaseAdmin()
    .from('payments')
    .insert({
      user_id: input.user.id,
      sku: plan.sku,
      amount_try: plan.totalPriceTry,
      status: 'pending',
      provider: PAYMENT_PROVIDER,
      channel: PAYMENT_CHANNEL,
      merchant_order_id: merchantOrderId,
    })
    .select('*')
    .single();

  if (error) throw error;

  const session = await createPaymentSession({
    amountTry: plan.totalPriceTry,
    merchantPaymentId: merchantOrderId,
    customerId: input.user.id,
    customerName:
      input.buyerName ?? input.user.full_name ?? 'Sanal Ogretmen Musteri',
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerIp: input.customerIp,
    returnUrl,
    productName: plan.labelTr,
  });

  const { data: updated, error: updErr } = await getSupabaseAdmin()
    .from('payments')
    .update({
      status: 'redirected',
      session_token: session.sessionToken,
      payment_page_url: session.paymentPageUrl,
      provider_response: session.raw,
    })
    .eq('id', payment.id)
    .select('*')
    .single();

  if (updErr) throw updErr;

  // Queue e-arşiv shell (issued after paid)
  await getSupabaseAdmin().from('invoices').insert({
    payment_id: payment.id,
    user_id: input.user.id,
    status: 'pending',
    invoice_type: 'earsiv',
    buyer_name: input.buyerName ?? input.user.full_name,
    buyer_tax_id: input.buyerTaxId ?? null,
    buyer_email: input.customerEmail,
    amount_try: plan.totalPriceTry,
  });

  return {
    payment: updated,
    plan,
    paymentPageUrl: session.paymentPageUrl,
    channel: PAYMENT_CHANNEL,
  };
}

export async function handleVakifpaysCallback(
  payload: Record<string, string>,
) {
  const orderId =
    payload.MERCHANTPAYMENTID ??
    payload.merchantPaymentId ??
    payload.ORDERID ??
    '';

  if (!orderId) {
    throw new AppError(400, 'MERCHANTPAYMENTID missing', 'CALLBACK_INVALID');
  }

  const { data: payment, error } = await getSupabaseAdmin()
    .from('payments')
    .select('*')
    .eq('merchant_order_id', orderId)
    .maybeSingle();

  if (error) throw error;
  if (!payment) {
    throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  }

  if (payment.status === 'paid') {
    return { payment, alreadyProcessed: true };
  }

  const ok = isCallbackSuccess(payload);
  if (!ok) {
    await getSupabaseAdmin()
      .from('payments')
      .update({
        status: 'failed',
        provider_response: payload,
      })
      .eq('id', payment.id);
    return { payment: { ...payment, status: 'failed' }, alreadyProcessed: false };
  }

  const plan = getPlanBySku(payment.sku) as PlanOffer;
  const starts = new Date();
  const ends = addPeriod(starts, plan.period);

  const { data: sub, error: subErr } = await getSupabaseAdmin()
    .from('subscriptions')
    .insert({
      user_id: payment.user_id,
      tier: plan.tier,
      period: plan.period,
      sku: plan.sku,
      status: 'active',
      price_try: plan.totalPriceTry,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      provider: PAYMENT_PROVIDER,
      channel: PAYMENT_CHANNEL,
    })
    .select('*')
    .single();

  if (subErr) throw subErr;

  await getSupabaseAdmin()
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      subscription_id: sub.id,
      provider_response: payload,
    })
    .eq('id', payment.id);

  await getSupabaseAdmin()
    .from('users')
    .update({
      tier: plan.tier,
      subscription_status: 'active',
    })
    .eq('id', payment.user_id);

  // Mark invoice ready for e-arşiv provider job
  await getSupabaseAdmin()
    .from('invoices')
    .update({ status: 'pending' })
    .eq('payment_id', payment.id)
    .eq('status', 'pending');

  return {
    payment: { ...payment, status: 'paid', subscription_id: sub.id },
    subscription: sub,
    alreadyProcessed: false,
  };
}
