// Broadcast a donation event to the user's overlay via Supabase Realtime.
// Uses the REST broadcast endpoint so the function doesn't need to subscribe
// to a channel — fire-and-forget.

export type OverlayDonation = {
  id: number;
  donator: string;
  amount: number;
  message: string;
  provider: string;
  created_at: string;
};

export async function broadcastDonation(
  overlayToken: string,
  donation: OverlayDonation,
): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.warn('[broadcast] missing supabase env vars; skipping');
    return;
  }

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `overlay-${overlayToken}`,
            event: 'donation',
            payload: donation,
            private: false,
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[broadcast] HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.error('[broadcast] failed:', err);
  }
}
