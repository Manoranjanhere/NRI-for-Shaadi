import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import ProfileService, { type MatchScore, type MemberProfile } from '../../services/profile.service';
import { useAuthStore } from '../../store/auth.store';
import { useInteractionAccess } from '../../hooks/useInteractionAccess';
import { handleActionError } from '../../utils/subscription';
import { activityText } from '../../utils/profileFormat';
import {
  cmToFeetInches,
  labelFor,
  incomeLabel,
  habitLabel,
  RELIGIONS,
  EDUCATION_LEVELS,
  MARITAL_STATUSES,
  DIETS,
} from '../../constants/profileOptions';
import type { ProfileDetailScreenProps } from '../../navigation/types';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_H = Math.round(SCREEN_W * 1.2);

const REPORT_REASONS = [
  { label: 'Fake profile / impersonation', value: 'fake_profile' },
  { label: 'Inappropriate photo', value: 'inappropriate_photo' },
  { label: 'Spam, scam or asking for money', value: 'spam' },
  { label: 'Harassment or abuse', value: 'harassment' },
  { label: 'Underage', value: 'underage' },
  { label: 'Already married / other', value: 'other' },
];

type Row = [string, string | number | null | undefined];

function Section({ title, icon, rows, children }: { title: string; icon: string; rows?: Row[]; children?: React.ReactNode }) {
  const visible = (rows ?? []).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!visible.length && !children) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {icon} {title}
      </Text>
      {visible.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{String(value)}</Text>
        </View>
      ))}
      {children}
    </View>
  );
}

function MatchPanel({ name, theirs, yours }: { name: string; theirs: MatchScore | null; yours: MatchScore | null }) {
  if (!theirs?.total && !yours?.total) return null;
  return (
    <View style={styles.matchPanel}>
      <Text style={styles.sectionTitle}>💞 Compatibility</Text>
      {theirs?.total ? (
        <View style={{ marginBottom: Spacing.sm }}>
          <Text style={styles.matchHeadline}>
            {name} matches <Text style={styles.gold}>{theirs.matched} of {theirs.total}</Text> of your preferences
          </Text>
          <View style={styles.checks}>
            {theirs.checks.map((c) => (
              <View key={c.key} style={[styles.check, c.matched ? styles.checkOn : styles.checkOff]}>
                <Text style={[styles.checkText, c.matched && { color: Colors.success }]}>
                  {c.matched ? '✓' : '✕'} {c.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {yours?.total ? (
        <Text style={styles.matchSub}>
          You match {yours.matched} of {yours.total} of {name}’s preferences
        </Text>
      ) : null}
    </View>
  );
}

export default function ProfileDetailScreen({ navigation, route }: ProfileDetailScreenProps) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((s) => s.user);
  const { requireAccess } = useInteractionAccess();
  const isSelf = authUser?.id === userId;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [messageModal, setMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [reportModal, setReportModal] = useState(false);
  const [reportPhotoId, setReportPhotoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await ProfileService.getFullProfile(userId));
    } catch (err) {
      handleActionError(navigation, err, 'Could not load profile');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [userId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.secondary} size="large" />
      </View>
    );
  }

  const p = profile;
  const firstName = p.name?.split(' ')[0] ?? 'They';

  const sendInterest = async () => {
    if (!requireAccess('send interests')) return;
    setBusy(true);
    try {
      const res = await ProfileService.toggleInterest(p.id, message.trim() || undefined);
      setMessageModal(false);
      setMessage('');
      if (res.isMatch) {
        Alert.alert('🎉 Connected!', `You and ${firstName} are now connected.`, [
          { text: 'Later', style: 'cancel' },
          { text: 'Chat now', onPress: () => navigation.navigate('ChatConversation', { userId: p.id, userName: p.name }) },
        ]);
      }
      await load();
    } catch (err) {
      handleActionError(navigation, err, 'Could not send interest');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = () =>
    Alert.alert('Withdraw interest?', `Your interest in ${firstName} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await ProfileService.toggleInterest(p.id);
            await load();
          } catch (err) {
            handleActionError(navigation, err);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const decline = () =>
    Alert.alert('Decline interest?', `${firstName} won’t be notified.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await ProfileService.declineInterest(p.id);
            navigation.goBack();
          } catch (err) {
            handleActionError(navigation, err);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const toggleShortlist = async () => {
    setProfile({ ...p, isShortlisted: !p.isShortlisted });
    try {
      await ProfileService.toggleShortlist(p.id);
    } catch (err) {
      setProfile({ ...p });
      handleActionError(navigation, err);
    }
  };

  const block = () =>
    Alert.alert(`Block ${firstName}?`, 'They will no longer see your profile or be able to contact you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/blocks/${p.id}`);
            navigation.goBack();
          } catch (err) {
            handleActionError(navigation, err);
          }
        },
      },
    ]);

  const report = async (reason: string) => {
    try {
      await ProfileService.reportUser(p.id, reason, undefined, reportPhotoId ?? undefined);
      setReportModal(false);
      setReportPhotoId(null);
      Alert.alert('Reported', 'Thank you. Our safety team will review this profile.');
    } catch (err) {
      handleActionError(navigation, err, 'Could not submit report');
    }
  };

  const openMenu = () =>
    Alert.alert(p.name, undefined, [
      { text: 'Report profile', onPress: () => setReportModal(true) },
      { text: 'Block', style: 'destructive', onPress: block },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const activity = activityText(p.lastActiveAt);
  const profileId = `NS${p.id.replace(/-/g, '').slice(0, 7).toUpperCase()}`;
  const prefs = p.partnerPreferences;

  const renderActions = () => {
    if (isSelf) {
      return (
        <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.primaryText}>✏️ Edit my profile</Text>
        </TouchableOpacity>
      );
    }
    const shortlistBtn = (
      <TouchableOpacity style={styles.iconBtn} onPress={toggleShortlist}>
        <Text style={styles.iconBtnText}>{p.isShortlisted ? '★' : '☆'}</Text>
      </TouchableOpacity>
    );
    if (p.isConnected) {
      return (
        <>
          {shortlistBtn}
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => navigation.navigate('ChatConversation', { userId: p.id, userName: p.name })}>
            <Text style={styles.primaryText}>💬 Chat with {firstName}</Text>
          </TouchableOpacity>
        </>
      );
    }
    if (p.interestReceived && !p.declinedByMe) {
      return (
        <>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={decline} disabled={busy}>
            <Text style={styles.outlineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1.4 }]} onPress={sendInterest} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>✓ Accept interest</Text>}
          </TouchableOpacity>
        </>
      );
    }
    if (p.interestSent) {
      const declined = p.interestSentStatus === 'declined';
      return (
        <>
          {shortlistBtn}
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={withdraw} disabled={busy}>
            <Text style={styles.outlineText}>{declined ? 'Interest not accepted' : '✓ Interest sent · Withdraw'}</Text>
          </TouchableOpacity>
        </>
      );
    }
    return (
      <>
        {shortlistBtn}
        <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => requireAccess('send interests') && setMessageModal(true)} disabled={busy}>
          <Text style={styles.primaryText}>💌 Send Interest</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: PHOTO_H }}>
          {p.photos.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            >
              {p.photos.map((photo) => (
                <View key={photo.id}>
                  <FastImage source={{ uri: photo.url }} style={{ width: SCREEN_W, height: PHOTO_H }} />
                  {!isSelf ? (
                    <TouchableOpacity
                      style={styles.flag}
                      onPress={() => {
                        setReportPhotoId(photo.id);
                        setReportModal(true);
                      }}
                    >
                      <Text style={{ color: '#fff' }}>⚑</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.center, { height: PHOTO_H, backgroundColor: Colors.surfaceElevated }]}>
              <Text style={{ fontSize: 80, color: Colors.textMuted }}>{p.name?.[0]}</Text>
            </View>
          )}
          {p.photos.length > 1 ? (
            <View style={[styles.dots, { top: insets.top + 8 }]}>
              {p.photos.map((ph, i) => (
                <View key={ph.id} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
          <View style={[styles.topBar, { top: insets.top + 18 }]}>
            <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.roundText}>‹</Text>
            </TouchableOpacity>
            {!isSelf ? (
              <TouchableOpacity style={styles.roundBtn} onPress={openMenu}>
                <Text style={[styles.roundText, { fontSize: 20 }]}>⋯</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <LinearGradient colors={['transparent', Colors.background]} style={styles.photoFade} pointerEvents="none" />
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{p.name}</Text>
            {p.photoVerifiedStatus === 'verified' ? <Text style={styles.verified}>✓ Verified</Text> : null}
            {p.isPremium ? <Text style={styles.premium}>👑</Text> : null}
          </View>
          <Text style={styles.headline}>
            {[p.age ? `${p.age} yrs` : '', cmToFeetInches(p.heightCm), p.city && p.country ? `${p.city}, ${p.country}` : p.country]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.meta}>
            {[profileId, activity, p.profileCreatedBy && p.profileCreatedBy !== 'self' ? `Managed by ${labelFor(p.profileCreatedBy).toLowerCase()}` : '']
              .filter(Boolean)
              .join(' · ')}
          </Text>

          {!isSelf && p.interestReceived && p.interestReceivedMessage && !p.isConnected ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>{firstName} sent you an interest</Text>
              <Text style={styles.note}>“{p.interestReceivedMessage}”</Text>
            </View>
          ) : null}

          {!isSelf ? <MatchPanel name={firstName} theirs={p.theyMatchYourPreferences} yours={p.youMatchTheirPreferences} /> : null}

          {!isSelf ? (
            <View style={styles.contactBox}>
              <Text style={styles.sectionTitle}>📞 Contact details</Text>
              {p.contact ? (
                <>
                  {p.contact.phone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${p.contact?.phone}`)}>
                      <Text style={styles.contactValue}>{p.contact.phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {p.contact.email ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${p.contact?.email}`)}>
                      <Text style={styles.contactValue}>{p.contact.email}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {!p.contact.phone && !p.contact.email ? <Text style={styles.muted}>No contact details added.</Text> : null}
                </>
              ) : p.contactLocked ? (
                <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
                  <Text style={styles.muted}>🔒 Upgrade to Premium to view {firstName}’s phone and email.</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.muted}>🔒 Shared once you’re connected — both of you accept each other’s interest.</Text>
              )}
            </View>
          ) : null}

          {p.bio ? (
            <Section title={`About ${firstName}`} icon="📝">
              <Text style={styles.paragraph}>{p.bio}</Text>
            </Section>
          ) : null}

          <Section
            title="Basic details"
            icon="👤"
            rows={[
              ['Age', p.age ? `${p.age} years` : null],
              ['Height', p.heightCm ? `${cmToFeetInches(p.heightCm)} (${p.heightCm} cm)` : null],
              ['Marital status', labelFor(p.maritalStatus, MARITAL_STATUSES)],
              ['Children', p.hasChildren ? labelFor(p.hasChildren) : null],
              ['Profile created by', labelFor(p.profileCreatedBy)],
            ]}
          />

          <Section
            title="Religion & community"
            icon="🪔"
            rows={[
              ['Religion', labelFor(p.religion, RELIGIONS)],
              ['Community', [p.community, p.subCommunity].filter(Boolean).join(', ')],
              ['Caste no bar', p.casteNoBar ? 'Yes' : null],
              ['Mother tongue', p.motherTongue],
              ['Gotra', p.gotra],
              ['Manglik', labelFor(p.manglik)],
              ['Rashi', p.rashi],
              ['Birth', [p.birthTime, p.birthPlace].filter(Boolean).join(', ')],
            ]}
          />

          <Section
            title="Location & residency"
            icon="🌍"
            rows={[
              ['Lives in', [p.city, p.state, p.country].filter(Boolean).join(', ')],
              ['Residency status', labelFor(p.residencyStatus)],
              ['Citizenship', p.citizenship],
              ['Grew up in', p.grewUpIn],
              ['Native place', [p.nativeCity, p.nativeState].filter(Boolean).join(', ')],
              ['Willing to relocate', labelFor(p.willingToRelocate)],
            ]}
          />

          <Section
            title="Education & career"
            icon="🎓"
            rows={[
              ['Education', [labelFor(p.educationLevel, EDUCATION_LEVELS), p.educationField].filter(Boolean).join(' – ')],
              ['College', p.college],
              ['Occupation', p.occupation],
              ['Employer', p.employer],
              ['Works in', labelFor(p.workSector)],
              ['Annual income', p.annualIncome && p.annualIncome !== 'undisclosed' ? incomeLabel(p.annualIncome) : null],
            ]}
          />

          <Section
            title="Family"
            icon="👨‍👩‍👧"
            rows={[
              ['Family type', labelFor(p.familyType)],
              ['Family values', labelFor(p.familyValues)],
              ['Family status', labelFor(p.familyStatus)],
              ["Father", p.fatherOccupation],
              ["Mother", p.motherOccupation],
              ['Siblings', p.brothers || p.sisters ? `${p.brothers ?? 0} brother(s), ${p.sisters ?? 0} sister(s)` : null],
              ['Family based in', p.familyLocation],
            ]}
          >
            {p.aboutFamily ? <Text style={[styles.paragraph, { marginTop: Spacing.sm }]}>{p.aboutFamily}</Text> : null}
          </Section>

          <Section
            title="Lifestyle"
            icon="🌿"
            rows={[
              ['Diet', labelFor(p.diet, DIETS)],
              ['Smoking', habitLabel(p.smoking)],
              ['Drinking', habitLabel(p.drinking)],
            ]}
          >
            {p.hobbies?.length ? (
              <View style={styles.tags}>
                {p.hobbies.map((h) => (
                  <View key={h} style={styles.tag}>
                    <Text style={styles.tagText}>{h}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Section>

          {prefs ? (
            <Section
              title={`What ${isSelf ? 'you are' : `${firstName} is`} looking for`}
              icon="💍"
              rows={[
                ['Age', prefs.minAge || prefs.maxAge ? `${prefs.minAge ?? 18} – ${prefs.maxAge ?? 75} yrs` : null],
                ['Height', prefs.minHeightCm || prefs.maxHeightCm ? `${cmToFeetInches(prefs.minHeightCm)} – ${cmToFeetInches(prefs.maxHeightCm)}` : null],
                ['Marital status', prefs.maritalStatuses?.map((v) => labelFor(v, MARITAL_STATUSES)).join(', ')],
                ['Religion', prefs.religions?.map((v) => labelFor(v, RELIGIONS)).join(', ')],
                ['Community', prefs.communities?.join(', ')],
                ['Mother tongue', prefs.motherTongues?.join(', ')],
                ['Living in', prefs.countries?.join(', ')],
                ['Education', prefs.educationLevels?.map((v) => labelFor(v, EDUCATION_LEVELS)).join(', ')],
                ['Diet', prefs.diets?.map((v) => labelFor(v, DIETS)).join(', ')],
                ['Manglik', prefs.manglik && prefs.manglik !== 'any' ? (prefs.manglik === 'yes' ? 'Manglik' : 'Non-manglik') : null],
              ]}
            >
              {prefs.about ? <Text style={[styles.paragraph, { marginTop: Spacing.sm }]}>{prefs.about}</Text> : null}
            </Section>
          ) : null}

          {!isSelf ? (
            <Text style={styles.safety}>
              🛡️ Stay safe: never send money or share bank details. Meet in public places and involve family early.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.sm }]}>{renderActions()}</View>

      <Modal transparent animationType="slide" visible={messageModal} onRequestClose={() => setMessageModal(false)}>
        <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Text style={styles.sheetTitle}>Send interest to {firstName}</Text>
            <Text style={styles.muted}>Add a short personal note (optional) — it makes a warm first impression.</Text>
            <TextInput
              style={styles.messageInput}
              placeholder={`Namaste ${firstName}, I liked your profile and would love to connect…`}
              placeholderTextColor={Colors.textMuted}
              value={message}
              onChangeText={setMessage}
              maxLength={255}
              multiline
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={sendInterest} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>💌 Send Interest</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMessageModal(false)} style={{ alignItems: 'center', marginTop: Spacing.sm }}>
              <Text style={styles.muted}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent animationType="slide" visible={reportModal} onRequestClose={() => setReportModal(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Text style={styles.sheetTitle}>{reportPhotoId ? 'Report this photo' : `Report ${firstName}`}</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity key={r.value} style={styles.reportRow} onPress={() => report(r.value)}>
                <Text style={styles.reportText}>{r.label}</Text>
                <Text style={styles.muted}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => {
                setReportModal(false);
                setReportPhotoId(null);
              }}
              style={{ alignItems: 'center', marginTop: Spacing.md }}
            >
              <Text style={{ color: Colors.secondary, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  flag: { position: 'absolute', bottom: 70, right: 16, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 4 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff' },
  topBar: { position: 'absolute', left: Spacing.md, right: Spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  roundText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  photoFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  body: { paddingHorizontal: Spacing.md, marginTop: -Spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { color: Colors.textPrimary, fontSize: FontSize.xxxl - 4, fontWeight: '800' },
  verified: { color: '#fff', backgroundColor: '#1D9BF0', fontSize: FontSize.xs, fontWeight: '800', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  premium: { fontSize: 18 },
  headline: { color: Colors.textPrimary, fontSize: FontSize.lg, marginTop: 4 },
  meta: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
  noteBox: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.secondary },
  noteLabel: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 4 },
  note: { color: Colors.textPrimary, fontStyle: 'italic', fontSize: FontSize.md },
  matchPanel: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.secondary + '55' },
  matchHeadline: { color: Colors.textPrimary, fontSize: FontSize.md, marginBottom: Spacing.sm },
  gold: { color: Colors.secondary, fontWeight: '800' },
  checks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  check: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  checkOn: { borderColor: Colors.success + '88' },
  checkOff: { borderColor: Colors.border },
  checkText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  matchSub: { color: Colors.textSecondary, fontSize: FontSize.sm },
  contactBox: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  contactValue: { color: Colors.secondaryLight, fontSize: FontSize.lg, fontWeight: '700', marginTop: 4 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { color: Colors.secondary, fontSize: FontSize.md, fontWeight: '800', marginBottom: Spacing.sm },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowLabel: { width: 130, color: Colors.textMuted, fontSize: FontSize.sm },
  rowValue: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500' },
  paragraph: { color: Colors.textPrimary, fontSize: FontSize.md, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  tag: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  safety: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.lg, textAlign: 'center' },
  muted: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  primaryBtn: { height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  primaryText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  outlineBtn: { height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  outlineText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  iconBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: Colors.secondary, fontSize: 24 },
  sheetBackdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm },
  sheetTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
  messageInput: {
    minHeight: 100,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    padding: Spacing.md,
    textAlignVertical: 'top',
    marginVertical: Spacing.sm,
  },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  reportText: { color: Colors.textPrimary, fontSize: FontSize.md },
});
