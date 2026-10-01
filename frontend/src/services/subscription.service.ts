import { api } from './api';

export interface PlanConfig {
  id: string;
  name: string;
  tier: number;
  monthlyPrice: number;
  badge: string;
  color: string;
  features: string[];
  playProductIds?: { monthly: string };
}

export interface AccessStatus {
  hasPremiumAccess: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  subscriptionActive: boolean;
  subscriptionExpiresAt: string | null;
}

export interface MyPlansResponse {
  plans: PlanConfig[];
  freeTrialDays: number;
  referralBonusDays: number;
  access: AccessStatus;
  paymentProvider: string;
}

const SubscriptionService = {
  async getMyPlans(): Promise<MyPlansResponse> {
    const { data } = await api.get<MyPlansResponse>('/subscriptions/my-plans');
    return data;
  },

  async getFeatureFlags(): Promise<{ paidFeaturesDisabled: boolean }> {
    const { data } = await api.get('/subscriptions/feature-flags');
    return data;
  },

  async getCurrentSubscription(): Promise<{ access: AccessStatus; plan: PlanConfig | null }> {
    const { data } = await api.get('/subscriptions/current');
    return data;
  },
};

export default SubscriptionService;
