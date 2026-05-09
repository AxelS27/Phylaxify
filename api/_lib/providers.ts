import { createHmac, timingSafeEqual } from 'node:crypto';

export type Donation = {
  provider: 'saweria' | 'trakteer' | 'test';
  donation_id: string;
  donator: string;
  amount: number;
  message: string;
};

// ────────────── Saweria ──────────────

export function parseSaweria(body: any): Donation {
  return {
    provider: 'saweria',
    donation_id: body?.id ?? `saweria-${Date.now()}`,
    donator: body?.donator_name ?? 'Anonymous',
    amount: Number(body?.amount_raw ?? 0),
    message: body?.message ?? '',
  };
}

export function verifySaweria(rawBody: string, signature: string | undefined, streamKey: string): boolean {
  if (!signature || !streamKey) return false;
  try {
    const computed = createHmac('sha256', streamKey).update(rawBody).digest('hex');
    const a = Buffer.from(computed);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ────────────── Trakteer ──────────────

export function parseTrakteer(body: any): Donation {
  return {
    provider: 'trakteer',
    donation_id: body?.transaction_id ?? `trakteer-${Date.now()}`,
    donator: body?.supporter_name ?? 'Anonymous',
    amount: Number(body?.price ?? 0),
    message: body?.supporter_message ?? '',
  };
}

// ────────────── Test ──────────────

export function parseTest(body: any): Donation {
  return {
    provider: 'test',
    donation_id: `test-${Date.now()}`,
    donator: body?.donator ?? 'TestDonor',
    amount: Number(body?.amount ?? 10000),
    message: body?.message ?? '',
  };
}
