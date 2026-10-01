import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/auth.store';
import { useFeatureFlagsStore } from '../../store/featureFlags.store';
import { getMembershipState, PREMIUM_PRICE_INR } from '../../utils/subscription';

/** Trial countdown / expired prompt. Hidden for paying members. */
export default function MembershipBanner({ compact }: { compact?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const paidFeaturesDisabled = useFeatureFlagsStore((s) => s.paidFeaturesDisabled);
  const navigation = useNavigation<any>();
  const state = getMembershipState(user);

  if (paidFeaturesDisabled || state.kind === 'premium') return null;
  if (state.kind === 'trial' && state.daysLeft > 7 && compact) return null;

  const expired = state.kind === 'expired';
  const title = expired
    ? 'Your free month has ended'
    : `${state.daysLeft} day${state.daysLeft === 1 ? '' : 's'} left in your free month`;
  const body = expired
    ? `Upgrade for ₹${PREMIUM_PRICE_INR}/month to send interests and chat with matches.`
    : 'Send interests and chat freely during your trial.';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Subscription')}>
      <LinearGradient
        colors={expired ? [Colors.primary, Colors.primaryDark] : [Colors.surfaceElevated, Colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <Text style={styles.icon}>{expired ? '👑' : '🎁'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <Text style={styles.cta}>{expired ? 'Upgrade' : 'Plans'} ›</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.secondary + '55',
    marginBottom: Spacing.sm + 4,
  },
  icon: { fontSize: 24 },
  title: { color: Colors.secondaryLight, fontSize: FontSize.md, fontWeight: '700' },
  body: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  cta: { color: Colors.secondary, fontWeight: '800', fontSize: FontSize.sm },
});
