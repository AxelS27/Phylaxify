import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

const PREMIUM_PRICE_IDR = 29_000;

function getMidtransBaseUrl(): string {
  const isProd = process.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
  return isProd
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';
}

function midtransAuth(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  return 'Basic ' + Buffer.from(`${serverKey}:`).toString('base64');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const jwt = req.headers.authorization?.replace('Bearer ', '');
  if (!jwt) return res.status(401).json({ error: 'missing authorization' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) return res.status(401).json({ error: 'invalid token' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, plan, plan_expires_at')
    .eq('id', user.id)
    .single();

  if (!profile) return res.status(404).json({ error: 'profile not found' });

  // Block if premium is still active with more than 1 day left (prevents double-pay)
  const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : 0;
  if (profile.plan === 'premium' && msLeft > 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'already_premium', expires_at: profile.plan_expires_at });
  }

  const orderId = `phylaxify-premium-${user.id}-${Date.now()}`;
  const appUrl = process.env.VITE_APP_URL ?? '';

  // Insert pending subscription
  const { error: insertError } = await supabaseAdmin.from('subscriptions').insert({
    user_id: user.id,
    order_id: orderId,
    status: 'pending',
    amount: PREMIUM_PRICE_IDR,
  });
  if (insertError) {
    console.error('[create-transaction] insert failed:', insertError);
    return res.status(500).json({ error: 'db error' });
  }

  // Call Midtrans SNAP API
  const snapPayload = {
    transaction_details: { order_id: orderId, gross_amount: PREMIUM_PRICE_IDR },
    item_details: [{
      id: 'phylaxify-premium-monthly',
      price: PREMIUM_PRICE_IDR,
      quantity: 1,
      name: 'Phylaxify Premium — 30 Hari',
    }],
    customer_details: {
      first_name: profile.username,
      email: user.email,
    },
    callbacks: {
      finish: `${appUrl}/upgrade?payment=finish`,
    },
  };

  const snapRes = await fetch(`${getMidtransBaseUrl()}/transactions`, {
    method: 'POST',
    headers: { Authorization: midtransAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(snapPayload),
  });

  if (!snapRes.ok) {
    const text = await snapRes.text();
    console.error('[create-transaction] Midtrans error:', text.slice(0, 300));
    let detail = `HTTP ${snapRes.status}`;
    try {
      const parsed = JSON.parse(text);
      detail = parsed.error_messages?.join(', ') ?? parsed.message ?? detail;
    } catch { /* not JSON */ }
    return res.status(502).json({ error: 'midtrans_error', detail });
  }

  const { token: snapToken, redirect_url } = await snapRes.json() as {
    token: string;
    redirect_url: string;
  };

  // Save snap_token for reference
  await supabaseAdmin
    .from('subscriptions')
    .update({ snap_token: snapToken })
    .eq('order_id', orderId);

  return res.status(200).json({ snap_token: snapToken, order_id: orderId, redirect_url });
}
