export type Plan = 'free' | 'premium';

export const PLAN_LIMITS = {
  free: { blocklist: 50 },
  premium: { blocklist: 500 },
} as const;

export const PREMIUM_PRICE_IDR = 150_000;

export function isActivePremium(plan: Plan, planExpiresAt: string | null): boolean {
  if (plan !== 'premium') return false;
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) > new Date();
}

export function getEffectivePlan(plan: Plan, planExpiresAt: string | null): Plan {
  return isActivePremium(plan, planExpiresAt) ? 'premium' : 'free';
}

export function getBlocklistLimit(plan: Plan, planExpiresAt: string | null): number {
  return PLAN_LIMITS[getEffectivePlan(plan, planExpiresAt)].blocklist;
}
