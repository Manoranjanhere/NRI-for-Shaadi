import React from 'react';
import { View } from 'react-native';
import type { PartnerPreferences } from '../../store/auth.store';
import {
  MARITAL_STATUSES,
  RELIGIONS,
  MOTHER_TONGUES,
  COUNTRIES,
  EDUCATION_LEVELS,
  DIETS,
  COMMUNITY_SUGGESTIONS,
  MIN_AGE,
  MAX_AGE,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  cmToFeetInches,
} from '../../constants/profileOptions';
import { ChipSelect, MultiChipSelect, SectionTitle, Stepper, TextField } from '../common/FormControls';

interface Props {
  value: PartnerPreferences;
  onChange: (value: PartnerPreferences) => void;
}

export function defaultPreferences(gender?: string, age?: number | null, religion?: string | null): PartnerPreferences {
  const a = age ?? 28;
  const [minAge, maxAge] = gender === 'female' ? [a, a + 7] : [Math.max(MIN_AGE, a - 6), a + 1];
  return {
    minAge,
    maxAge,
    minHeightCm: gender === 'female' ? 165 : 150,
    maxHeightCm: gender === 'female' ? 195 : 180,
    maritalStatuses: ['never_married'],
    religions: religion ? [religion] : [],
    communities: [],
    motherTongues: [],
    countries: [],
    educationLevels: [],
    diets: [],
    manglik: 'any',
    about: '',
  };
}

export default function PartnerPreferencesForm({ value, onChange }: Props) {
  const set = <K extends keyof PartnerPreferences>(key: K, v: PartnerPreferences[K]) => onChange({ ...value, [key]: v });
  const minAge = value.minAge ?? 21;
  const maxAge = value.maxAge ?? 35;
  const minH = value.minHeightCm ?? 150;
  const maxH = value.maxHeightCm ?? 190;
  const communitySuggestions = (value.religions ?? []).flatMap((r) => COMMUNITY_SUGGESTIONS[r] ?? []);

  return (
    <View>
      <SectionTitle title="Age & height" />
      <Stepper label="Minimum age" value={minAge} min={MIN_AGE} max={maxAge} onChange={(v) => set('minAge', v)} />
      <Stepper label="Maximum age" value={maxAge} min={minAge} max={MAX_AGE} onChange={(v) => set('maxAge', v)} />
      <Stepper
        label="Minimum height"
        value={minH}
        min={MIN_HEIGHT_CM}
        max={maxH}
        step={3}
        format={cmToFeetInches}
        onChange={(v) => set('minHeightCm', v)}
      />
      <Stepper
        label="Maximum height"
        value={maxH}
        min={minH}
        max={MAX_HEIGHT_CM}
        step={3}
        format={cmToFeetInches}
        onChange={(v) => set('maxHeightCm', v)}
      />

      <SectionTitle title="Background" subtitle="Leave a section empty to mean “open to all”." />
      <MultiChipSelect label="Marital status" options={MARITAL_STATUSES} values={value.maritalStatuses} onChange={(v) => set('maritalStatuses', v)} />
      <MultiChipSelect label="Religion" options={RELIGIONS} values={value.religions} onChange={(v) => set('religions', v)} />
      {communitySuggestions.length > 0 ? (
        <MultiChipSelect
          label="Community / caste"
          hint="Members with “caste no bar” are always included."
          options={communitySuggestions}
          values={value.communities}
          onChange={(v) => set('communities', v)}
        />
      ) : null}
      <MultiChipSelect label="Mother tongue" options={MOTHER_TONGUES} values={value.motherTongues} onChange={(v) => set('motherTongues', v)} />
      <ChipSelect
        label="Manglik"
        options={[
          { value: 'any', label: "Doesn't matter" },
          { value: 'no', label: 'Non-manglik only' },
          { value: 'yes', label: 'Manglik only' },
        ]}
        value={value.manglik ?? 'any'}
        onChange={(v) => set('manglik', v as PartnerPreferences['manglik'])}
      />

      <SectionTitle title="Location" subtitle="Countries your partner could be living in." />
      <MultiChipSelect options={COUNTRIES} values={value.countries} onChange={(v) => set('countries', v)} />

      <SectionTitle title="Education & lifestyle" />
      <MultiChipSelect label="Education" options={EDUCATION_LEVELS} values={value.educationLevels} onChange={(v) => set('educationLevels', v)} />
      <MultiChipSelect label="Diet" options={DIETS} values={value.diets} onChange={(v) => set('diets', v)} />

      <TextField
        label="Anything else you're looking for?"
        placeholder="e.g. Someone family-oriented, settled in North America, open to living near parents…"
        value={value.about ?? ''}
        onChangeText={(t) => set('about', t)}
        multiline
        maxLength={500}
      />
    </View>
  );
}
