import { supabaseAdmin } from './supabaseAdmin.js';
import { filterDonation } from './filter.js';
import type { Donation } from './providers.js';

type ProfileLite = {
  id: string;
  filter_enabled: boolean;
  plan: string;
  plan_expires_at: string | null;
  model_tier: string | null;
};

/**
 * Look up profile by webhook_token. Returns null if not found.
 */
export async function findProfileByWebhookToken(token: string): Promise<ProfileLite | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, filter_enabled, plan, plan_expires_at, model_tier')
    .eq('webhook_token', token)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileLite;
}

/**
 * Filter the donation against the user's settings, persist the result, and
 * return the row that was inserted. Realtime auto-broadcasts to overlay.
 */
export async function processDonation(profile: ProfileLite, d: Donation) {
  let filterResult = { blocked: false, reason: 'filter disabled', confidence: 0, layer: 'none' as string };

  if (profile.filter_enabled) {
    const { data: blocklistRows } = await supabaseAdmin
      .from('blocklist')
      .select('word')
      .eq('user_id', profile.id);
    const customBlocklist = (blocklistRows ?? []).map((r: any) => r.word as string);

    const isPremium =
      profile.plan === 'premium' &&
      profile.plan_expires_at !== null &&
      new Date(profile.plan_expires_at) > new Date();
    // Free users are locked to SVM. Premium users use their stored preference (default dl).
    const requestedTier = (profile.model_tier ?? 'svm') as 'svm' | 'dl';
    const modelTier = isPremium ? requestedTier : 'svm';

    filterResult = await filterDonation(d.donator, d.message, customBlocklist, [], true, modelTier);
  }

  const insertPayload = {
    user_id: profile.id,
    provider: d.provider,
    donation_id: d.donation_id,
    donator_name: d.donator,
    amount: d.amount,
    message: d.message,
    blocked: filterResult.blocked,
    filter_reason: filterResult.reason,
    filter_layer: filterResult.layer,
    confidence: filterResult.confidence,
  };

  const { data, error } = await supabaseAdmin
    .from('donations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[processDonation] insert failed:', error);
    throw new Error(`db insert failed: ${error.message}`);
  }

  return { donation: data, filterResult };
}
