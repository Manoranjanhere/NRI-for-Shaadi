import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SubscriptionScreenProps } from '../../navigation/types';
import { Colors, FontSize, Spacing, BorderRadius } from '../../theme';
import SubscriptionService, { type AccessStatus, type PlanConfig } from '../../services/subscription.service';
import PlayBilling from '../../services/playBilling.service';
import ProfileService from '../../services/profile.service';
import { useAuthStore } from '../../store/auth.store';
import { useAppCountry } from '../../hooks/useAppCountry';
import { BrandRings } from '../../components/brand/BrandLogo';
import { errorMessage, FREE_TRIAL_DAYS, PREMIUM_PRICE_INR } from '../../utils/subscription';

const COMPARISON: [string, boolean, boolean][] = [
  ['Create profile & add photos', true, true],
  ['Browse & search all profiles', true, true],
  ['Shortlist profiles', true, true],
  ['See who viewed your profile', true, true],
  ['Send & accept interests', false, true],
  ['Chat with connections', false, true],
  ['View contact details of connections', false, true],
  ['Premium badge on your profile', false, true],
];

const FAQ: [string, string][] = [
  ['Is the price the same for brides and grooms?', `Yes — everyone pays the same ₹${PREMIUM_PRICE_INR}/month. No hidden charges.`],
  ['What happens after my free month?', 'You can keep browsing, searching and shortlisting for free. Sending interests and chatting need Premium.'],
  ['Can I cancel anytime?', 'Yes. Manage or cancel from Google Play → Payments & subscriptions. You keep Premium until the end of the paid month.'],
  ['How do I get extra free days?', 'Share your referral code. When a friend joins with it, you both get 7 extra free days.'],
];

export default function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { formatMoney, countryCode } = useAppCountry();

  const [plan, setPlan] = useState<PlanConfig | null>(null);
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const load = async () => {
    try {
      const res = await SubscriptionService.getMyPlans();
      const premium = res.plans[0] ?? null;
      setPlan(premium);
      setAccess(res.access);
      if (premium && Platform.OS === 'android') {
        const sku = premium.playProductIds?.monthly ?? PlayBilling.getProductId(premium.id);
        const prices = await PlayBilling.fetchLocalizedPlayPrices([sku]);
        setPrice(prices[sku] ?? null);
      }
    } catch (err) {
      Alert.alert('Could not load plans', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subscribe = async () => {
    if (!plan) return;
    if (Platform.OS !== 'android') {
      Alert.alert('Android only', 'Premium is purchased through Google Play on Android.');
      return;
    }
    setPurchasing(true);
    try {
      await PlayBilling.purchasePlan(plan.id);
      const me = await ProfileService.getMe();
      updateUser(me);
      await load();
      Alert.alert('Welcome to Premium 👑', 'You can now send interests and chat with your matches.');
    } catch (err) {
      const msg = errorMessage(err, 'Purchase failed');
      if (!msg.toLowerCase().includes('cancel')) Alert.alert('Payment failed', msg);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.secondary} size="large" />
      </View>
    );
  }

  const monthly = plan?.monthlyPrice ?? PREMIUM_PRICE_INR;
  const displayPrice = price ?? `₹${monthly}`;
  const localHint = !price && countryCode !== 'IN' ? `≈ ${formatMoney(monthly)} per month` : null;

  const status = (() => {
    if (access?.subscriptionActive) {
      const until = access.subscriptionExpiresAt ? new Date(access.subscriptionExpiresAt).toDateString() : null;
      return { icon: '👑', title: 'Premium is active', body: until ? `Renews / valid until ${until}` : 'Enjoy full access.' };
    }
    if (access?.trialActive) {
      return {
        icon: '🎁',
        title: `${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? '' : 's'} left in your free month`,
        body: 'Everything is unlocked during your trial. Subscribe anytime to continue without a break.',
      };
    }
    return {
      icon: '⏳',
      title: 'Your free month has ended',
      body: 'Upgrade to keep sending interests and chatting with your matches.',
    };
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <LinearGradient colors={[Colors.primaryDark, Colors.background]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <BrandRings size={70} />
          <Text style={styles.title}>NRI Shaadi Premium</Text>
          <Text style={styles.subtitle}>One simple plan for brides and grooms</Text>
        </View>
      </LinearGradient>

      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>{status.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{status.title}</Text>
          <Text style={styles.statusBody}>{status.body}</Text>
        </View>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>{plan?.badge ?? '👑'} {plan?.name ?? 'Premium'}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{displayPrice}</Text>
          <Text style={styles.per}>/month</Text>
        </View>
        {localHint ? <Text style={styles.localHint}>{localHint} · billed by Google Play in your currency</Text> : null}
        <Text style={styles.trialNote}>First {FREE_TRIAL_DAYS} days free for every new member</Text>
        <View style={styles.divider} />
        {(plan?.features ?? []).map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.cta, access?.subscriptionActive && styles.ctaDisabled]}
          onPress={subscribe}
          disabled={purchasing || !!access?.subscriptionActive}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color="#2B0510" />
          ) : (
            <Text style={styles.ctaText}>
              {access?.subscriptionActive ? '✓ You are Premium' : access?.trialActive ? 'Subscribe now' : 'Upgrade to Premium'}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.fine}>Auto-renews monthly via Google Play. Cancel anytime.</Text>
      </View>

      <View style={styles.box}>
        <View style={styles.compareHeader}>
          <Text style={[styles.compareLabel, { flex: 1 }]} />
          <Text style={styles.compareCol}>Free</Text>
          <Text style={[styles.compareCol, { color: Colors.secondary }]}>Premium</Text>
        </View>
        {COMPARISON.map(([label, free, premium]) => (
          <View key={label} style={styles.compareRow}>
            <Text style={[styles.compareLabel, { flex: 1 }]}>{label}</Text>
            <Text style={[styles.compareCol, { color: free ? Colors.success : Colors.textMuted }]}>{free ? '✓' : '—'}</Text>
            <Text style={[styles.compareCol, { color: premium ? Colors.success : Colors.textMuted }]}>{premium ? '✓' : '—'}</Text>
          </View>
        ))}
      </View>

      {user?.referralCode ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>🎁 Get free days</Text>
          <Text style={styles.statusBody}>
            Share your code <Text style={{ color: Colors.secondary, fontWeight: '800' }}>{user.referralCode}</Text> — you and your friend
            both get 7 extra free days when they join.
          </Text>
        </View>
      ) : null}

      <View style={styles.box}>
        <Text style={styles.boxTitle}>Questions</Text>
        {FAQ.map(([q, a]) => (
          <View key={q} style={{ marginTop: Spacing.sm }}>
            <Text style={styles.q}>{q}</Text>
            <Text style={styles.a}>{a}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  back: { color: Colors.textPrimary, fontSize: 34, lineHeight: 36 },
  title: { color: Colors.secondaryLight, fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.md, marginTop: 4 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusIcon: { fontSize: 30 },
  statusTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  statusBody: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2, lineHeight: 19 },
  planCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
  },
  planName: { color: Colors.secondaryLight, fontSize: FontSize.lg, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.sm },
  price: { color: Colors.textPrimary, fontSize: 44, fontWeight: '900' },
  per: { color: Colors.textSecondary, fontSize: FontSize.lg, marginBottom: 8, marginLeft: 4 },
  localHint: { color: Colors.textMuted, fontSize: FontSize.xs },
  trialNote: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  featureRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 8 },
  featureCheck: { color: Colors.success, fontWeight: '800' },
  featureText: { color: Colors.textPrimary, fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
  cta: { marginTop: Spacing.md, backgroundColor: Colors.secondary, borderRadius: BorderRadius.full, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#2B0510', fontSize: FontSize.lg, fontWeight: '900' },
  fine: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm },
  box: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  boxTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', marginBottom: 4 },
  compareHeader: { flexDirection: 'row', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  compareRow: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  compareLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  compareCol: { width: 70, textAlign: 'center', color: Colors.textPrimary, fontWeight: '800', fontSize: FontSize.sm },
  q: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  a: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 19, marginTop: 2 },
});
