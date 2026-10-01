import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import type { ProfileSummary } from '../../services/profile.service';
import { basicsLine, careerLocationLine } from '../../utils/profileFormat';

interface Props {
  profile: ProfileSummary;
  onPress: () => void;
  /** Small caption under the details, e.g. "Viewed 2h ago". */
  caption?: string;
  /** Quoted personal note, e.g. the message sent with an interest. */
  note?: string | null;
  badge?: { text: string; color: string };
  children?: React.ReactNode;
}

export default function ProfileRow({ profile, onPress, caption, note, badge, children }: Props) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.top} onPress={onPress} activeOpacity={0.85}>
        {profile.primaryPhoto ? (
          <FastImage source={{ uri: profile.primaryPhoto }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.initial}>{profile.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>
            {profile.photoVerifiedStatus === 'verified' ? <Text style={styles.verified}>✓</Text> : null}
            {profile.isPremium ? <Text style={styles.crown}>👑</Text> : null}
          </View>
          <Text style={styles.line} numberOfLines={1}>
            {basicsLine(profile)}
          </Text>
          <Text style={styles.line} numberOfLines={1}>
            {careerLocationLine(profile)}
          </Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
        {badge ? (
          <View style={[styles.badge, { borderColor: badge.color }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      {note ? <Text style={styles.note}>“{note}”</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

export function RowButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'gold';
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        variant === 'primary' && { backgroundColor: Colors.primary },
        variant === 'gold' && { backgroundColor: Colors.secondary },
        variant === 'outline' && { borderWidth: 1, borderColor: Colors.border },
        disabled && { opacity: 0.5 },
      ]}
      activeOpacity={0.85}
    >
      <Text style={[styles.btnText, variant === 'gold' && { color: '#2B0510' }, variant === 'outline' && { color: Colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.sm + 4,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: 76, height: 92, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: Colors.textMuted, fontSize: 28, fontWeight: '700' },
  info: { flex: 1, marginLeft: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', flexShrink: 1 },
  verified: {
    color: '#fff',
    backgroundColor: '#1D9BF0',
    fontSize: 10,
    fontWeight: '900',
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
  },
  crown: { fontSize: 13 },
  line: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 3 },
  caption: { color: Colors.secondary, fontSize: FontSize.xs, marginTop: 5, fontWeight: '600' },
  badge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  note: {
    color: Colors.textPrimary,
    fontStyle: 'italic',
    fontSize: FontSize.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm + 2 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.full, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
});
