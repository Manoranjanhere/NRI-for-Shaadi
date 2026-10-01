// ─── Free trial & referral ──────────────────────────────────────────────────
export const FREE_TRIAL_DAYS = 30;
/** Both the referrer and the new member get this many extra premium days. */
export const REFERRAL_BONUS_DAYS = 7;

// ─── Legacy coins (no longer sold in the app; kept so old balances still resolve) ─
export const COIN_VALUE_INR = 50;
export const DAILY_LOGIN_COINS = 1;
export const REFERRAL_REWARD_COINS = 10;
export const REFERRAL_SIGNUP_BONUS_COINS = 10;
export const COIN_ACTION_COST = 1;

export const PLAY_SKU_PREFIX = 'nrishaadi';

// ─── Subscription tiers ──────────────────────────────────────────────────────
export enum SubscriptionTier {
  NONE = 0,
  PREMIUM = 1,
}

// ─── Fair-use daily limits for premium / trial members ───────────────────────
export interface DailyQuotas {
  interests: number;
  newConversations: number;
}

export const PREMIUM_DAILY_QUOTAS: DailyQuotas = {
  interests: 50,
  newConversations: 30,
};

// ─── Billing periods (Google Play) ─────────────────────────────────────────
export type BillingPeriod = 'monthly';

export const BILLING_PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
};

/** Google Play subscription SKU: nrishaadi_premium_1m */
export function getPlaySubscriptionProductId(planId: string, _period: BillingPeriod = 'monthly'): string {
  return `${PLAY_SKU_PREFIX}_${planId}_1m`;
}

export function getPlayCoinProductId(packId: string): string {
  return `${PLAY_SKU_PREFIX}_${packId}`;
}

export function parsePlayCoinProductId(productId: string): string | null {
  const match = productId.match(new RegExp(`^${PLAY_SKU_PREFIX}_coins_(\\d+)$`));
  if (!match) return null;
  const packId = `coins_${match[1]}`;
  if (!COIN_PACKS.find((p) => p.id === packId)) return null;
  return packId;
}

export function parsePlaySubscriptionProductId(
  productId: string,
): { planId: string; period: BillingPeriod } | null {
  const match = productId.match(new RegExp(`^${PLAY_SKU_PREFIX}_(.+)_1m$`));
  if (!match) return null;
  const planId = match[1];
  if (!getPlanById(planId)) return null;
  return { planId, period: 'monthly' };
}

// ─── Plan definition ─────────────────────────────────────────────────────────
export interface PlanConfig {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;   // INR
  badge: string;
  color: string;
  features: string[];
}

export const PREMIUM_PLAN: PlanConfig = {
  id: 'premium',
  name: 'NRI Shaadi Premium',
  tier: SubscriptionTier.PREMIUM,
  monthlyPrice: 300,
  badge: '👑',
  color: '#D4A017',
  features: [
    `Send up to ${PREMIUM_DAILY_QUOTAS.interests} interests a day`,
    'Accept interests and connect instantly',
    'Unlimited chat with your connections',
    `Start up to ${PREMIUM_DAILY_QUOTAS.newConversations} new conversations a day`,
    'View contact details of accepted connections',
    'See who viewed your profile',
    'Same price for brides and grooms — ₹300/month',
  ],
};

export const ALL_PLANS: PlanConfig[] = [PREMIUM_PLAN];

export function enrichPlanWithPlayIds(plan: PlanConfig) {
  return {
    ...plan,
    playProductIds: {
      monthly: getPlaySubscriptionProductId(plan.id, 'monthly'),
    },
  };
}

export function getPlayCatalog() {
  return {
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.nrishaadi.app',
    subscriptions: ALL_PLANS.map((plan) => ({
      productId: getPlaySubscriptionProductId(plan.id, 'monthly'),
      planId: plan.id,
      period: 'monthly' as BillingPeriod,
      priceInr: plan.monthlyPrice,
      months: 1,
    })),
  };
}

export function getPlanById(planId: string): PlanConfig | undefined {
  return ALL_PLANS.find((p) => p.id === planId);
}

// ─── Access rule ─────────────────────────────────────────────────────────────
export interface PremiumAccessFields {
  trialEndsAt?: Date | string | null;
  subscriptionTier?: number | null;
  subscriptionExpiresAt?: Date | string | null;
}

export function isTrialActive(user: PremiumAccessFields): boolean {
  return !!user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now();
}

export function isSubscriptionActive(user: PremiumAccessFields): boolean {
  if ((user.subscriptionTier ?? 0) <= SubscriptionTier.NONE) return false;
  if (!user.subscriptionExpiresAt) return true;
  return new Date(user.subscriptionExpiresAt).getTime() > Date.now();
}

/** Sending interests and messages needs an active trial or paid subscription. */
export function hasPremiumAccess(user: PremiumAccessFields): boolean {
  return isTrialActive(user) || isSubscriptionActive(user);
}

export function isPaidFeaturesDisabled(): boolean {
  return (
    process.env.DISABLE_PAID_FEATURES === 'true' ||
    process.env.NODE_ENV === 'development'
  );
}

// ─── Legacy coin packs ──────────────────────────────────────────────────────
export interface CoinPack {
  id: string;
  coins: number;
  priceInr: number;
  label: string;
  emoji: string;
}

export const COIN_PACKS: CoinPack[] = [];
