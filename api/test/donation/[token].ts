import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findProfileByWebhookToken, processDonation } from '../../_lib/processDonation.js';
import { parseTest } from '../../_lib/providers.js';

// Test endpoint — used by the in-app TestLab page.
// Requires the webhook token (so only the owner can fire test events).

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const token = String(req.query.token ?? '');
  if (!token) return res.status(400).json({ error: 'missing token' });

  const profile = await findProfileByWebhookToken(token);
  if (!profile) return res.status(404).json({ error: 'unknown webhook token' });

  try {
    const donation = parseTest(req.body ?? {});
    const { donation: row, filterResult } = await processDonation(profile, donation);
    return res.status(200).json({
      ok: true,
      donation: row,
      filter: filterResult,
    });
  } catch (err) {
    console.error('[test donation] error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
