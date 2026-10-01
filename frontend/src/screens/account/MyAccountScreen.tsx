import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, RefreshControl } from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Colors, FontSize, Spacing, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import ProfileService, { type UserPhoto } from '../../services/profile.service';
import { useAuthStore, type AppUser } from '../../store/auth.store';
import { getMembershipState } from '../../utils/subscription';
import { basicsLine, careerLocationLine } from '../../utils/profileFormat';
import BrandLogo from '../../components/brand/BrandLogo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COMPLETENESS_FIELDS: (keyof AppUser)[] = [
  'name', 'dateOfBirth', 'heightCm', 'maritalStatus', 'religion', 'community', 'motherTongue',
  'country', 'city', 'residencyStatus', 'citizenship', 'grewUpIn', 'nativeState',
  'educationLevel', 'educationField', 'occupation', 'annualIncome',
  'diet', 'familyType', 'familyValues', 'fatherOccupation', 'motherOccupation', 'bio', 'hobbies',
];

function profileCompleteness(user: AppUser, photoCount: number, hasPrefs: boolean): number {
  const filled = COMPLETENESS_FIELDS.filter((k) => {
    const v = user[k];
    return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '';
  }).length;
  const score =
    (filled / COMPLETENESS_FIELDS.length) * 70 +
    Math.min(photoCount, 3) * 5 +
    (hasPrefs ? 10 : 0) +
    (user.isVerified ? 5 : 0);
  return Math.min(100, Math.round(score));
}

export function profileCode(id: string): string {
  return `NS${id.replace(/-/g, '').slice(0, 7).toUpperCase()}`;
}

export default function MyAccountScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [me, photoRes] = await Promise.all([
        ProfileService.getMe(),
        api.get<UserPhoto[]>('/users/profile/photos'),
      ]);
      updateUser(me);
      setPhotos(photoRes.data ?? []);
    } catch {
      /* keep cached values */
    }
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!user) return null;

  const primary = photos.find((p) => p.isPrimary) ?? photos[0];
  const hasPrefs = !!user.partnerPreferences && Object.keys(user.partnerPreferences).length > 0;
  const completeness = profileCompleteness(user, photos.length, hasPrefs);
  const membership = getMembershipState(user);

  const shareReferral = async () => {
    try {
      const code = user.referralCode || (await ProfileService.getReferralCode());
      if (!user.referralCode) updateUser({ referralCode: code });
      await Share.share({
        message:
          `I'm using NRI Shaadi to find a life partner — matrimony for Indians around the world. ` +
          `Join with my code ${code} and we both get 7 extra free days of Premium!`,
      });
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);

  const membershipCard = (() => {
    if (membership.kind === 'premium') {
      const until = membership.expiresAt ? new Date(membership.expiresAt).toDateString() : '';
      return { icon: '👑', title: 'Premium member', body: until ? `Valid until ${until}` : 'Full access unlocked', cta: 'Manage' };
    }
    if (membership.kind === 'trial') {
      const days = membership.daysLeft;
      return {
        icon: '🎁',
        title: `Free trial · ${days} day${days === 1 ? '' : 's'} left`,
        body: 'Interests and chat are unlocked. Continue for ₹300/month after your trial.',
        cta: 'View plan',
      };
    }
    return { icon: '⏳', title: 'Free trial ended', body: 'Upgrade for ₹300/month to send interests and chat.', cta: 'Upgrade' };
  })();

  const menu: { icon: string; label: string; hint?: string; onPress: () => void }[] = [
    { icon: '👁️', label: 'View my profile', hint: 'See how others see you', onPress: () => navigation.navigate('ProfileDetail', { userId: user.id }) },
    { icon: '✏️', label: 'Edit profile', hint: 'Basics, religion, career, family, about', onPress: () => navigation.navigate('EditProfile') },
    { icon: '💞', label: 'Partner preferences', hint: 'Improves your recommended matches', onPress: () => navigation.navigate('PartnerPreferences') },
    { icon: '📷', label: 'Photos', hint: `${photos.length}/6 added`, onPress: () => navigation.navigate('Stage2') },
    {
      icon: user.isVerified ? '✅' : '🛡️',
      label: user.isVerified ? 'Photo verified' : 'Verify your photo',
      hint: user.isVerified ? 'Verified badge on your profile' : 'Verified profiles get more responses',
      onPress: () => navigation.navigate('PhotoVerification'),
    },
    { icon: '⭐', label: 'Shortlisted profiles', onPress: () => navigation.navigate('Shortlist') },
    { icon: '👀', label: 'Who viewed my profile', onPress: () => navigation.navigate('ProfileVisitors') },
    { icon: '🎁', label: 'Refer friends & family', hint: 'You both get 7 free days', onPress: shareReferral },
    { icon: '🔒', label: 'Privacy & account', hint: 'Contact visibility, hide or delete profile', onPress: () => navigation.navigate('AccountSettings') },
  ];
  if (user.isAdmin) {
    menu.push({ icon: '🛠️', label: user.isSuperAdmin ? 'Admin panel (Super admin)' : 'Admin panel', onPress: () => navigation.navigate('AdminPanel') });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={Colors.secondary}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
        />
      }
    >
      <LinearGradient colors={[Colors.primaryDark, Colors.background]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <BrandLogo variant="inline" size={26} />
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Stage2')} activeOpacity={0.8}>
            {primary ? (
              <FastImage source={{ uri: primary.url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Text style={{ fontSize: 30 }}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name} {user.isVerified ? '✅' : ''}
            </Text>
            <Text style={styles.code}>Profile ID: {profileCode(user.id)}</Text>
            <Text style={styles.meta} numberOfLines={1}>{basicsLine(user)}</Text>
            <Text style={styles.meta} numberOfLines={1}>{careerLocationLine(user)}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>Profile completeness</Text>
            <Text style={styles.progressValue}>{completeness}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completeness}%` }]} />
          </View>
          {completeness < 80 ? (
            <Text style={styles.progressHint}>Complete profiles with photos get up to 3× more interests.</Text>
          ) : null}
        </View>
      </LinearGradient>

      <TouchableOpacity style={styles.memberCard} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.85}>
        <Text style={styles.memberIcon}>{membershipCard.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberTitle}>{membershipCard.title}</Text>
          <Text style={styles.memberBody}>{membershipCard.body}</Text>
        </View>
        <View style={styles.memberCta}>
          <Text style={styles.memberCtaText}>{membershipCard.cta}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.menu}>
        {menu.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, i === menu.length - 1 && { borderBottomWidth: 0 }]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.hint ? <Text style={styles.menuHint}>{item.hint}</Text> : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>NRI Shaadi · Matrimony for Indians around the world</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: Colors.secondary },
  avatarEmpty: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  name: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
  code: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  meta: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  progressWrap: { marginTop: Spacing.lg },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  progressValue: { color: Colors.secondaryLight, fontSize: FontSize.sm, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.surface, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.secondary },
  progressHint: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 6 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  memberIcon: { fontSize: 30 },
  memberTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  memberBody: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 },
  memberCta: { backgroundColor: Colors.secondary, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 7 },
  memberCtaText: { color: '#2B0510', fontWeight: '800', fontSize: FontSize.xs },
  menu: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  menuHint: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  chevron: { color: Colors.textMuted, fontSize: 24 },
  logout: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  logoutText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.md },
  footer: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.lg },
});
