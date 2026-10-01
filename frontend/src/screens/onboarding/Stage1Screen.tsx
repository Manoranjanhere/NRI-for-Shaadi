import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { useAuthStore, type PartnerPreferences } from '../../store/auth.store';
import { storage } from '../../services/api';
import ProfileService, { type ProfileFormValues } from '../../services/profile.service';
import {
  PROFILE_FOR,
  GENDERS,
  MARITAL_STATUSES,
  HAS_CHILDREN,
  RELIGIONS,
  COMMUNITY_SUGGESTIONS,
  MOTHER_TONGUES,
  MANGLIK,
  RASHIS,
  COUNTRIES,
  RESIDENCY_STATUSES,
  RELOCATE_OPTIONS,
  EDUCATION_LEVELS,
  WORK_SECTORS,
  INCOME_BRACKETS,
  DIETS,
  HABIT_OPTIONS,
  FAMILY_TYPES,
  FAMILY_VALUES,
  FAMILY_STATUSES,
  HOBBIES,
  INDIAN_STATES,
  HEIGHT_OPTIONS,
  ageFromDob,
} from '../../constants/profileOptions';
import {
  ChipSelect,
  MultiChipSelect,
  PickerField,
  Stepper,
  TextField,
  ToggleRow,
  SectionTitle,
} from '../../components/common/FormControls';
import PartnerPreferencesForm, { defaultPreferences } from '../../components/profile/PartnerPreferencesForm';
import BrandLogo from '../../components/brand/BrandLogo';
import { errorMessage } from '../../utils/subscription';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Stage1' | 'EditProfile'>;

const DRAFT_KEY = 'profileDraft';

const STEPS = [
  { key: 'basics', title: 'Basic details', subtitle: 'Let’s start with the essentials.' },
  { key: 'religion', title: 'Religion & community', subtitle: 'Helps families find the right background.' },
  { key: 'nri', title: 'Where you live', subtitle: 'Your NRI status matters to many families.' },
  { key: 'career', title: 'Education & career', subtitle: 'Share your qualifications and work.' },
  { key: 'family', title: 'Family details', subtitle: 'Tell members about your family.' },
  { key: 'about', title: 'Lifestyle & about you', subtitle: 'Let your personality shine.' },
  { key: 'prefs', title: 'Partner preferences', subtitle: 'We’ll recommend matches based on this.' },
] as const;

/** Only keys accepted by PATCH /users/profile/stage1. */
const PAYLOAD_KEYS: (keyof ProfileFormValues)[] = [
  'profileCreatedBy', 'name', 'gender', 'dateOfBirth', 'heightCm', 'maritalStatus', 'hasChildren', 'email',
  'religion', 'community', 'subCommunity', 'gotra', 'casteNoBar', 'motherTongue', 'manglik', 'birthTime',
  'birthPlace', 'rashi', 'country', 'state', 'city', 'citizenship', 'residencyStatus', 'grewUpIn',
  'nativeState', 'nativeCity', 'willingToRelocate', 'educationLevel', 'educationField', 'college',
  'occupation', 'employer', 'workSector', 'annualIncome', 'diet', 'smoking', 'drinking', 'hobbies',
  'familyType', 'familyValues', 'familyStatus', 'fatherOccupation', 'motherOccupation', 'brothers',
  'sisters', 'familyLocation', 'aboutFamily', 'bio', 'partnerPreferences', 'showContactToConnections',
  'referredByCode',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

function buildPayload(values: ProfileFormValues): ProfileFormValues {
  const out: Record<string, unknown> = {};
  PAYLOAD_KEYS.forEach((key) => {
    let v = values[key] as unknown;
    if (typeof v === 'string') v = v.trim();
    if (v === '' || v === null || v === undefined) return;
    out[key] = v;
  });
  return out as ProfileFormValues;
}

export default function Stage1Screen({ navigation, route }: Props) {
  const isEdit = route.name === 'EditProfile';
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const scrollRef = useRef<ScrollView>(null);

  const initial = useMemo<ProfileFormValues>(() => {
    const draft = !isEdit ? storage.getString(DRAFT_KEY) : undefined;
    if (draft) {
      try {
        return JSON.parse(draft);
      } catch {
        /* ignore corrupt draft */
      }
    }
    const { id: _id, ...fromUser } = (user ?? {}) as Record<string, unknown>;
    return {
      profileCreatedBy: 'self',
      casteNoBar: false,
      showContactToConnections: true,
      brothers: 0,
      sisters: 0,
      ...(fromUser as ProfileFormValues),
      referredByCode: undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [dobYear, dobMonth, dobDay] = (values.dateOfBirth ?? '').split('-');

  useEffect(() => {
    if (!isEdit) storage.set(DRAFT_KEY, JSON.stringify(values));
  }, [values, isEdit]);

  const set = <K extends keyof ProfileFormValues>(key: K, v: ProfileFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const setDob = (part: 'y' | 'm' | 'd', v: string) => {
    const y = part === 'y' ? v : dobYear || '';
    const m = part === 'm' ? v : dobMonth || '';
    const d = part === 'd' ? v : dobDay || '';
    set('dateOfBirth', `${y}-${m}-${d}`);
  };

  const age = ageFromDob(values.dateOfBirth);
  const isSelf = values.profileCreatedBy === 'self';
  const whose = isSelf ? 'your' : 'their';

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 58 }, (_, i) => String(now - 18 - i));
  }, []);

  const validate = (): string | null => {
    switch (STEPS[step].key) {
      case 'basics':
        if (!values.name || values.name.trim().length < 2) return 'Please enter the full name.';
        if (!values.gender) return 'Please select bride or groom.';
        if (!dobYear || !dobMonth || !dobDay || age === null) return 'Please select the date of birth.';
        if (age < 18) return 'Members must be at least 18 years old.';
        if (!values.heightCm) return 'Please select height.';
        if (!values.maritalStatus) return 'Please select marital status.';
        return null;
      case 'religion':
        if (!values.religion) return 'Please select religion.';
        if (!values.motherTongue) return 'Please select mother tongue.';
        return null;
      case 'nri':
        if (!values.country) return 'Please select the country you live in.';
        if (!values.city || values.city.trim().length < 2) return 'Please enter your city.';
        return null;
      case 'about':
        if (!values.bio || values.bio.trim().length < 30) {
          return 'Please write at least 30 characters about yourself — profiles with a good description get far more responses.';
        }
        if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) return 'Please enter a valid email.';
        if (values.referredByCode && values.referredByCode.length !== 6) return 'Referral codes are 6 characters.';
        return null;
      default:
        return null;
    }
  };

  const goTo = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleNext = async () => {
    const problem = validate();
    if (problem) {
      Alert.alert('Almost there', problem);
      return;
    }
    if (STEPS[step].key === 'about' && !values.partnerPreferences) {
      set('partnerPreferences', defaultPreferences(values.gender, age, values.religion));
    }
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    await save();
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await ProfileService.saveProfile(buildPayload(values));
      updateUser({ ...data, profileStage: Math.max(data.profileStage ?? 1, 1) as 1 | 2 | 3 });
      storage.delete(DRAFT_KEY);
      if (isEdit) {
        Alert.alert('Profile updated', 'Your changes are live.');
        navigation.goBack();
      } else {
        navigation.replace('Stage2');
      }
    } catch (err) {
      Alert.alert('Could not save profile', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      goTo(step - 1);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    Alert.alert('Go back to login?', 'Your answers so far are saved on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Go back',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  const renderStep = () => {
    switch (STEPS[step].key) {
      case 'basics':
        return (
          <>
            <ChipSelect
              label="This profile is for"
              required
              options={PROFILE_FOR}
              value={values.profileCreatedBy}
              onChange={(v) => set('profileCreatedBy', v)}
            />
            <TextField
              label={isSelf ? 'Your full name' : 'Full name of the bride / groom'}
              required
              placeholder="e.g. Priya Sharma"
              value={values.name ?? ''}
              onChangeText={(t) => set('name', t)}
              maxLength={60}
            />
            <ChipSelect label="Profile of a" required options={GENDERS} value={values.gender} onChange={(v) => set('gender', v)} />
            <Text style={styles.label}>Date of birth <Text style={{ color: Colors.primaryLight }}>*</Text></Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <PickerField
                  label="Day"
                  options={Array.from({ length: 31 }, (_, i) => pad(i + 1))}
                  value={dobDay}
                  onChange={(v) => setDob('d', v)}
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <PickerField
                  label="Month"
                  options={MONTHS.map((m, i) => ({ value: pad(i + 1), label: m }))}
                  value={dobMonth}
                  onChange={(v) => setDob('m', v)}
                />
              </View>
              <View style={{ flex: 1.3 }}>
                <PickerField label="Year" options={yearOptions} value={dobYear} onChange={(v) => setDob('y', v)} />
              </View>
            </View>
            {age !== null && age >= 18 ? <Text style={styles.hint}>Age: {age} years</Text> : null}
            <PickerField
              label="Height"
              required
              options={HEIGHT_OPTIONS}
              value={values.heightCm ? String(values.heightCm) : undefined}
              onChange={(v) => set('heightCm', Number(v))}
            />
            <ChipSelect label="Marital status" required options={MARITAL_STATUSES} value={values.maritalStatus} onChange={(v) => set('maritalStatus', v)} />
            {values.maritalStatus && values.maritalStatus !== 'never_married' ? (
              <ChipSelect label="Children" options={HAS_CHILDREN} value={values.hasChildren} onChange={(v) => set('hasChildren', v)} />
            ) : null}
          </>
        );

      case 'religion': {
        const suggestions = COMMUNITY_SUGGESTIONS[values.religion ?? ''] ?? [];
        const hinduLike = ['hindu', 'jain', 'sikh', 'buddhist'].includes(values.religion ?? '');
        return (
          <>
            <ChipSelect label="Religion" required options={RELIGIONS} value={values.religion} onChange={(v) => set('religion', v)} />
            <PickerField label="Mother tongue" required options={MOTHER_TONGUES} value={values.motherTongue} onChange={(v) => set('motherTongue', v)} searchable />
            <TextField label="Community / caste" placeholder="e.g. Brahmin, Jat, Sunni" value={values.community ?? ''} onChangeText={(t) => set('community', t)} maxLength={60} />
            {suggestions.length ? (
              <ChipSelect options={suggestions} value={values.community} onChange={(v) => set('community', v)} allowDeselect />
            ) : null}
            <TextField label="Sub-community (optional)" value={values.subCommunity ?? ''} onChangeText={(t) => set('subCommunity', t)} maxLength={60} />
            <ToggleRow
              label="Caste no bar"
              hint="Open to matches from all communities"
              value={!!values.casteNoBar}
              onChange={(v) => set('casteNoBar', v)}
            />
            {hinduLike ? (
              <>
                <SectionTitle title="Horoscope (optional)" subtitle="Many families match kundli — adding it builds trust." />
                <TextField label="Gotra" value={values.gotra ?? ''} onChangeText={(t) => set('gotra', t)} maxLength={60} />
                <ChipSelect label="Manglik" options={MANGLIK} value={values.manglik} onChange={(v) => set('manglik', v)} allowDeselect />
                <PickerField label="Rashi (moon sign)" options={RASHIS} value={values.rashi} onChange={(v) => set('rashi', v)} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <TextField label="Time of birth" placeholder="HH:mm (24h)" value={values.birthTime ?? ''} onChangeText={(t) => set('birthTime', t)} maxLength={5} keyboardType="numbers-and-punctuation" />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <TextField label="Place of birth" placeholder="e.g. Jaipur" value={values.birthPlace ?? ''} onChangeText={(t) => set('birthPlace', t)} maxLength={100} />
                  </View>
                </View>
              </>
            ) : null}
          </>
        );
      }

      case 'nri':
        return (
          <>
            <PickerField label="Country you live in" required options={COUNTRIES} value={values.country} onChange={(v) => set('country', v)} searchable />
            <TextField label="State / province" placeholder="e.g. California, Ontario" value={values.state ?? ''} onChangeText={(t) => set('state', t)} maxLength={60} />
            <TextField label="City" required placeholder="e.g. San Jose" value={values.city ?? ''} onChangeText={(t) => set('city', t)} maxLength={100} />
            <ChipSelect label="Residency status" options={RESIDENCY_STATUSES} value={values.residencyStatus} onChange={(v) => set('residencyStatus', v)} />
            <PickerField label="Citizenship" options={COUNTRIES} value={values.citizenship} onChange={(v) => set('citizenship', v)} searchable />
            <PickerField label="Grew up in" options={COUNTRIES} value={values.grewUpIn} onChange={(v) => set('grewUpIn', v)} searchable />
            <SectionTitle title="Roots in India" />
            <PickerField label="Native state" options={INDIAN_STATES} value={values.nativeState} onChange={(v) => set('nativeState', v)} searchable />
            <TextField label="Native city / town" placeholder="e.g. Ludhiana" value={values.nativeCity ?? ''} onChangeText={(t) => set('nativeCity', t)} maxLength={100} />
            <ChipSelect label="Willing to relocate after marriage?" options={RELOCATE_OPTIONS} value={values.willingToRelocate} onChange={(v) => set('willingToRelocate', v)} />
          </>
        );

      case 'career':
        return (
          <>
            <ChipSelect label="Highest education" options={EDUCATION_LEVELS} value={values.educationLevel} onChange={(v) => set('educationLevel', v)} />
            <TextField label="Field of study" placeholder="e.g. Computer Science, Medicine" value={values.educationField ?? ''} onChangeText={(t) => set('educationField', t)} maxLength={100} />
            <TextField label="College / university" value={values.college ?? ''} onChangeText={(t) => set('college', t)} maxLength={120} />
            <ChipSelect label="Working in" options={WORK_SECTORS} value={values.workSector} onChange={(v) => set('workSector', v)} />
            <TextField label="Occupation" placeholder="e.g. Software Engineer" value={values.occupation ?? ''} onChangeText={(t) => set('occupation', t)} maxLength={100} />
            <TextField label="Company / employer" value={values.employer ?? ''} onChangeText={(t) => set('employer', t)} maxLength={100} />
            <ChipSelect label="Annual income (USD equivalent)" options={INCOME_BRACKETS} value={values.annualIncome} onChange={(v) => set('annualIncome', v)} />
          </>
        );

      case 'family':
        return (
          <>
            <ChipSelect label="Family type" options={FAMILY_TYPES} value={values.familyType} onChange={(v) => set('familyType', v)} />
            <ChipSelect label="Family values" options={FAMILY_VALUES} value={values.familyValues} onChange={(v) => set('familyValues', v)} />
            <ChipSelect label="Family status" options={FAMILY_STATUSES} value={values.familyStatus} onChange={(v) => set('familyStatus', v)} />
            <TextField label="Father's occupation" placeholder="e.g. Retired bank manager" value={values.fatherOccupation ?? ''} onChangeText={(t) => set('fatherOccupation', t)} maxLength={100} />
            <TextField label="Mother's occupation" placeholder="e.g. Homemaker" value={values.motherOccupation ?? ''} onChangeText={(t) => set('motherOccupation', t)} maxLength={100} />
            <Stepper label="Brothers" value={values.brothers ?? 0} min={0} max={15} onChange={(v) => set('brothers', v)} />
            <Stepper label="Sisters" value={values.sisters ?? 0} min={0} max={15} onChange={(v) => set('sisters', v)} />
            <TextField label="Family based in" placeholder="e.g. Pune, India / New Jersey, USA" value={values.familyLocation ?? ''} onChangeText={(t) => set('familyLocation', t)} maxLength={100} />
            <TextField label="About the family" placeholder="A few lines about your family background and values" value={values.aboutFamily ?? ''} onChangeText={(t) => set('aboutFamily', t)} multiline maxLength={1000} />
          </>
        );

      case 'about':
        return (
          <>
            <ChipSelect label="Diet" options={DIETS} value={values.diet} onChange={(v) => set('diet', v)} />
            <ChipSelect label="Smoking" options={HABIT_OPTIONS} value={values.smoking} onChange={(v) => set('smoking', v)} />
            <ChipSelect label="Drinking" options={HABIT_OPTIONS} value={values.drinking} onChange={(v) => set('drinking', v)} />
            <MultiChipSelect label="Hobbies & interests" hint="Pick up to 8" options={HOBBIES} values={values.hobbies ?? []} onChange={(v) => set('hobbies', v)} max={8} />
            <TextField
              label={isSelf ? 'About me' : 'About the bride / groom'}
              required
              placeholder={`Describe ${whose} personality, values, career and what makes ${isSelf ? 'you' : 'them'} unique…`}
              value={values.bio ?? ''}
              onChangeText={(t) => set('bio', t)}
              multiline
              maxLength={1000}
              hint={`${(values.bio ?? '').trim().length}/1000 · minimum 30 characters`}
            />
            <TextField
              label="Email (optional)"
              placeholder="name@example.com"
              value={values.email ?? ''}
              onChangeText={(t) => set('email', t)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <ToggleRow
              label="Share contact details with connections"
              hint="Phone and email are shown only to members whose interest you have accepted."
              value={values.showContactToConnections !== false}
              onChange={(v) => set('showContactToConnections', v)}
            />
            {!isEdit && !user?.referredByCode ? (
              <TextField
                label="Referral code (optional)"
                placeholder="6-character code from a friend"
                value={values.referredByCode ?? ''}
                onChangeText={(t) => set('referredByCode', t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={6}
                autoCapitalize="characters"
                hint="You and your friend both get 7 extra free days."
              />
            ) : null}
          </>
        );

      case 'prefs':
        return (
          <PartnerPreferencesForm
            value={values.partnerPreferences ?? defaultPreferences(values.gender, age, values.religion)}
            onChange={(p: PartnerPreferences) => set('partnerPreferences', p)}
          />
        );
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          {isEdit ? <Text style={styles.headerTitle}>Edit profile</Text> : <BrandLogo size={26} />}
          <Text style={styles.stepCount}>
            {step + 1}/{STEPS.length}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[Colors.secondaryLight, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]}
          />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.nextGradient}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextText}>
                  {isLast ? (isEdit ? 'Save changes' : 'Save & add photos') : 'Continue'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  back: { color: Colors.textPrimary, fontSize: 34, lineHeight: 36, width: 40 },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  stepCount: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 40, textAlign: 'right' },
  progressTrack: { height: 4, backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.md, marginTop: 4, marginBottom: Spacing.lg },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  hint: { color: Colors.secondaryLight, fontSize: FontSize.sm, marginTop: -8, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  footer: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  nextBtn: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  nextGradient: { paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
