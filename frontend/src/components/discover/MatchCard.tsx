import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import type { MatchCardUser } from '../../services/discover.service';
import { cmToFeetInches, labelFor, RELIGIONS } from '../../constants/profileOptions';
import { activityText, locationText } from '../../utils/profileFormat';

const CARD_W = Dimensions.get('window').width - Spacing.md * 2;
const PHOTO_H = Math.round(CARD_W * 1.15);

interface Props {
  user: MatchCardUser;
  interestState: 'none' | 'sending' | 'sent';
  onOpen: () => void;
  onInterest: () => void;
  onShortlist: () => void;
  onSkip: () => void;
}

function Detail({ icon, text }: { icon: string; text?: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function MatchCard({ user, interestState, onOpen, onInterest, onShortlist, onSkip }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = user.photos?.length ? user.photos : user.primaryPhoto ? [{ id: 'p', url: user.primaryPhoto, order: 0, isPrimary: true }] : [];
  const activity = activityText(user.lastActiveAt);
  const faith = [user.religion ? labelFor(user.religion, RELIGIONS) : '', user.community].filter(Boolean).join(' · ');
  const career = [user.occupation, user.educationLevel ? labelFor(user.educationLevel) : ''].filter(Boolean).join(' · ');
  const lives = [locationText(user), user.residencyStatus ? labelFor(user.residencyStatus).split(' /')[0] : ''].filter(Boolean).join(' · ');
  const roots = user.nativeState ? `Roots in ${user.nativeState}${user.grewUpIn ? ` · grew up in ${user.grewUpIn}` : ''}` : '';

  return (
    <View style={styles.card}>
      <View style={{ height: PHOTO_H }}>
        {photos.length ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / CARD_W))}
          >
            {photos.map((p) => (
              <TouchableOpacity key={p.id} activeOpacity={0.95} onPress={onOpen}>
                <FastImage source={{ uri: p.url }} style={{ width: CARD_W, height: PHOTO_H }} resizeMode={FastImage.resizeMode.cover} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity style={[styles.noPhoto, { height: PHOTO_H }]} onPress={onOpen}>
            <Text style={styles.noPhotoInitial}>{user.name?.[0]?.toUpperCase()}</Text>
            <Text style={styles.noPhotoText}>Photo not added yet</Text>
          </TouchableOpacity>
        )}

        {photos.length > 1 ? (
          <View style={styles.dots}>
            {photos.map((p, i) => (
              <View key={p.id} style={[styles.dot, i === photoIndex && styles.dotActive]} />
            ))}
          </View>
        ) : null}

        <View style={styles.topBadges} pointerEvents="none">
          {user.matchPercent !== null ? (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{user.matchPercent}% match</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {user.isPremium ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>👑 Premium</Text>
              </View>
            ) : null}
            {user.photoVerifiedStatus === 'verified' ? (
              <View style={[styles.pill, { backgroundColor: '#1D9BF0' }]}>
                <Text style={[styles.pillText, { color: '#fff' }]}>✓ Verified</Text>
              </View>
            ) : null}
          </View>
        </View>

        <LinearGradient colors={['transparent', 'rgba(18,9,11,0.95)']} style={styles.photoFooter} pointerEvents="none">
          {activity ? (
            <View style={styles.activity}>
              <View style={[styles.activityDot, activity === 'Online now' && { backgroundColor: Colors.success }]} />
              <Text style={styles.activityText}>{activity}</Text>
            </View>
          ) : null}
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.headline}>
            {[user.age ? `${user.age} yrs` : '', cmToFeetInches(user.heightCm), user.maritalStatus && user.maritalStatus !== 'never_married' ? labelFor(user.maritalStatus) : '']
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </LinearGradient>
      </View>

      <TouchableOpacity style={styles.details} activeOpacity={0.8} onPress={onOpen}>
        <Detail icon="🌍" text={lives} />
        <Detail icon="🪔" text={faith} />
        <Detail icon="🗣️" text={user.motherTongue} />
        <Detail icon="🎓" text={career} />
        <Detail icon="🏡" text={roots} />
        {user.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        ) : null}
        {user.profileCreatedBy && user.profileCreatedBy !== 'self' ? (
          <Text style={styles.createdBy}>Profile managed by {labelFor(user.profileCreatedBy).toLowerCase()}</Text>
        ) : null}
        <Text style={styles.viewMore}>View full profile ›</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconAction} onPress={onSkip} accessibilityLabel="Not interested">
          <Text style={styles.iconActionText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconAction} onPress={onShortlist} accessibilityLabel="Shortlist">
          <Text style={[styles.iconActionText, { color: Colors.secondary }]}>{user.isShortlisted ? '★' : '☆'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.interestBtn, interestState === 'sent' && styles.interestSent]}
          onPress={onInterest}
          disabled={interestState !== 'none'}
          activeOpacity={0.85}
        >
          {interestState === 'sending' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.interestText}>{interestState === 'sent' ? '✓ Interest sent' : '💌 Send Interest'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  noPhoto: { backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  noPhotoInitial: { color: Colors.textMuted, fontSize: 72, fontWeight: '800' },
  noPhotoText: { color: Colors.textMuted, marginTop: 8 },
  dots: { position: 'absolute', top: 10, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  dot: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff' },
  topBadges: {
    position: 'absolute',
    top: 22,
    left: Spacing.sm + 4,
    right: Spacing.sm + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchBadge: { backgroundColor: Colors.secondary, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  matchBadgeText: { color: '#2B0510', fontWeight: '800', fontSize: FontSize.xs },
  pill: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: BorderRadius.full, paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { color: Colors.secondaryLight, fontSize: FontSize.xs, fontWeight: '700' },
  photoFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.md, paddingTop: 60, paddingBottom: Spacing.md },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.secondary },
  activityText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  name: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  headline: { color: Colors.textPrimary, fontSize: FontSize.md, marginTop: 2 },
  details: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailIcon: { width: 26, fontSize: 14 },
  detailText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },
  bio: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 19, marginTop: 6 },
  createdBy: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 8 },
  viewMore: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: '700', marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, paddingTop: Spacing.sm },
  iconAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionText: { color: Colors.textSecondary, fontSize: 22, fontWeight: '700' },
  interestBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestSent: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.success },
  interestText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
