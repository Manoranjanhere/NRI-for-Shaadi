import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import type { MatchFilters } from '../../services/discover.service';
import {
  RELIGIONS,
  MOTHER_TONGUES,
  COUNTRIES,
  MARITAL_STATUSES,
  EDUCATION_LEVELS,
  DIETS,
  RESIDENCY_STATUSES,
  MIN_AGE,
  MAX_AGE,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  cmToFeetInches,
} from '../../constants/profileOptions';
import { MultiChipSelect, SectionTitle, Stepper, TextField, ToggleRow } from '../common/FormControls';

interface Props {
  visible: boolean;
  filters: MatchFilters;
  onApply: (filters: MatchFilters) => void;
  onClose: () => void;
}

export default function FiltersModal({ visible, filters, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<MatchFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const set = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const ageOn = draft.minAge !== undefined || draft.maxAge !== undefined;
  const heightOn = draft.minHeightCm !== undefined || draft.maxHeightCm !== undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Search filters</Text>
          <TouchableOpacity onPress={() => setDraft({})} hitSlop={12}>
            <Text style={styles.reset}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField
            label="Keyword"
            placeholder="Name, profession, city…"
            value={draft.keyword ?? ''}
            onChangeText={(t) => set('keyword', t || undefined)}
          />

          <SectionTitle title="Age & height" />
          <ToggleRow
            label="Filter by age"
            value={ageOn}
            onChange={(on) => setDraft((d) => ({ ...d, minAge: on ? 24 : undefined, maxAge: on ? 34 : undefined }))}
          />
          {ageOn ? (
            <>
              <Stepper label="From" value={draft.minAge ?? MIN_AGE} min={MIN_AGE} max={draft.maxAge ?? MAX_AGE} onChange={(v) => set('minAge', v)} />
              <Stepper label="To" value={draft.maxAge ?? MAX_AGE} min={draft.minAge ?? MIN_AGE} max={MAX_AGE} onChange={(v) => set('maxAge', v)} />
            </>
          ) : null}
          <ToggleRow
            label="Filter by height"
            value={heightOn}
            onChange={(on) => setDraft((d) => ({ ...d, minHeightCm: on ? 152 : undefined, maxHeightCm: on ? 188 : undefined }))}
          />
          {heightOn ? (
            <>
              <Stepper
                label="From"
                value={draft.minHeightCm ?? MIN_HEIGHT_CM}
                min={MIN_HEIGHT_CM}
                max={draft.maxHeightCm ?? MAX_HEIGHT_CM}
                step={3}
                format={cmToFeetInches}
                onChange={(v) => set('minHeightCm', v)}
              />
              <Stepper
                label="To"
                value={draft.maxHeightCm ?? MAX_HEIGHT_CM}
                min={draft.minHeightCm ?? MIN_HEIGHT_CM}
                max={MAX_HEIGHT_CM}
                step={3}
                format={cmToFeetInches}
                onChange={(v) => set('maxHeightCm', v)}
              />
            </>
          ) : null}

          <SectionTitle title="Living in" />
          <MultiChipSelect options={COUNTRIES} values={draft.countries} onChange={(v) => set('countries', v)} />
          <MultiChipSelect label="Residency status" options={RESIDENCY_STATUSES} values={draft.residencyStatuses} onChange={(v) => set('residencyStatuses', v)} />

          <SectionTitle title="Religion & community" />
          <MultiChipSelect label="Religion" options={RELIGIONS} values={draft.religions} onChange={(v) => set('religions', v)} />
          <TextField
            label="Community / caste"
            placeholder="e.g. Brahmin, Jat, Iyer"
            value={draft.community ?? ''}
            onChangeText={(t) => set('community', t || undefined)}
          />
          <MultiChipSelect label="Mother tongue" options={MOTHER_TONGUES} values={draft.motherTongues} onChange={(v) => set('motherTongues', v)} />

          <SectionTitle title="Background" />
          <MultiChipSelect label="Marital status" options={MARITAL_STATUSES} values={draft.maritalStatuses} onChange={(v) => set('maritalStatuses', v)} />
          <MultiChipSelect label="Education" options={EDUCATION_LEVELS} values={draft.educationLevels} onChange={(v) => set('educationLevels', v)} />
          <MultiChipSelect label="Diet" options={DIETS} values={draft.diets} onChange={(v) => set('diets', v)} />

          <SectionTitle title="Trust" />
          <ToggleRow label="Verified profiles only" value={!!draft.verifiedOnly} onChange={(v) => set('verifiedOnly', v || undefined)} />
          <ToggleRow label="Profiles with photos only" value={!!draft.withPhotoOnly} onChange={(v) => set('withPhotoOnly', v || undefined)} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.apply} onPress={() => onApply(draft)} activeOpacity={0.85}>
            <Text style={styles.applyText}>Show matches</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  cancel: { color: Colors.textSecondary, fontSize: FontSize.md },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  reset: { color: Colors.secondary, fontSize: FontSize.md, fontWeight: '600' },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  footer: { padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  apply: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 16, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
