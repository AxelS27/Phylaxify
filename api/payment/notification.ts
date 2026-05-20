import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  transaction_status: string;
  fraud_status?: string;
  signature_key: string;
};

function verifySignature(n: MidtransNotification, serverKey: string): boolean {
  const hash = createHash('sha512')
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${serverKey}`)
    .digest('hex');
  return hash === n.signature_key;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const body = req.body as MidtransNotification;
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';

  if (!verifySignature(body, serverKey)) {
    console.warn('[notification] invalid signature for order:', body.order_id);
    return res.status(401).json({ error: 'invalid signature' });
  }

  const isSuccess =
    body.transaction_status === 'settlement' ||
    (body.transaction_status === 'capture' && body.fraud_status === 'accept');

  const isFailed =
    body.transaction_status === 'deny' ||
    body.transaction_status === 'cancel' ||
    body.transaction_status === 'expire';

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('order_id', body.order_id)
    .single();

  if (!sub) {
    console.warn('[notification] unknown order_id:', body.order_id);
    return res.status(404).json({ error: 'order not found' });
  }

  // Idempotent: skip if already processed
  if (sub.status === 'paid' && isSuccess) {
    return res.status(200).json({ ok: true });
  }

  if (isSuccess) {
    const paidAt = new Date();
    const expiresAt = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .update({ status: 'paid', paid_at: paidAt.toISOString(), expires_at: expiresAt.toISOString() })
        .eq('order_id', body.order_id),
      supabaseAdmin
        .from('profiles')
        .update({ plan: 'premium', plan_expires_at: expiresAt.toISOString() })
        .eq('id', sub.user_id),
    ]);

    console.log(`[notification] premium activated for ${sub.user_id}, expires ${expiresAt.toISOString()}`);
  } else if (isFailed) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: body.transaction_status })
      .eq('order_id', body.order_id);
  }

  return res.status(200).json({ ok: true });
}
