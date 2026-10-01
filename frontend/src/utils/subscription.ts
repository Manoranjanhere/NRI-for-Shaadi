import { Alert } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { AppUser } from '../store/auth.store';

export const PREMIUM_PRICE_INR = 300;
export const FREE_TRIAL_DAYS = 30;

type AnyNavigation = NavigationProp<Record<string, object | undefined>>;

export function hasActiveSubscription(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if ((user.subscriptionTier ?? 0) <= 0) return false;
  if (user.subscriptionExpiresAt) {
    return new Date(user.subscriptionExpiresAt) > new Date();
  }
  return true;
}

export function trialDaysLeft(user: AppUser | null | undefined): number {
  if (!user?.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

export function isTrialActive(user: AppUser | null | undefined): boolean {
  return trialDaysLeft(user) > 0;
}

/** Free trial or paid Premium — required to send interests and messages. */
export function hasPremiumAccess(
  user: AppUser | null | undefined,
  paidFeaturesDisabled = false,
): boolean {
  return paidFeaturesDisabled || hasActiveSubscription(user) || isTrialActive(user);
}

export type MembershipState =
  | { kind: 'premium'; expiresAt: string | null }
  | { kind: 'trial'; daysLeft: number }
  | { kind: 'expired' };

export function getMembershipState(user: AppUser | null | undefined): MembershipState {
  if (hasActiveSubscription(user)) {
    return { kind: 'premium', expiresAt: user?.subscriptionExpiresAt ?? null };
  }
  const daysLeft = trialDaysLeft(user);
  if (daysLeft > 0) return { kind: 'trial', daysLeft };
  return { kind: 'expired' };
}

export function showPremiumRequiredAlert(navigation: AnyNavigation, feature = 'send interests and messages'): void {
  Alert.alert(
    'Your free month has ended',
    `Upgrade to NRI Shaadi Premium (₹${PREMIUM_PRICE_INR}/month) to ${feature}. You can still browse profiles and shortlist members for free.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
    ],
  );
}

export function errorMessage(err: unknown, fallback = 'Please try again'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } }; message?: string })
    ?.response?.data?.message;
  if (Array.isArray(msg)) return msg[0];
  return msg || (err as { message?: string })?.message || fallback;
}

/** Shows the upgrade prompt for premium errors from the API, otherwise a generic alert. */
export function handleActionError(navigation: AnyNavigation, err: unknown, title = 'Could not complete'): void {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const msg = errorMessage(err);
  if (status === 403 && /premium|trial|subscribe/i.test(msg)) {
    showPremiumRequiredAlert(navigation);
    return;
  }
  Alert.alert(title, msg);
}
