import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  type TextInputProps,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import type { Option } from '../../constants/profileOptions';

const toOptions = (list: (Option | string)[]): Option[] =>
  list.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

interface TextFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  hint?: string;
}

export function TextField({ label, required, hint, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, rest.multiline && styles.multiline, style]}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

interface ChipSelectProps {
  label?: string;
  required?: boolean;
  options: (Option | string)[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  allowDeselect?: boolean;
}

export function ChipSelect({ label, required, options, value, onChange, allowDeselect }: ChipSelectProps) {
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <View style={styles.chips}>
        {toOptions(options).map((o) => {
          const selected = o.value === value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(selected && allowDeselect ? '' : o.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface MultiChipSelectProps {
  label?: string;
  hint?: string;
  options: (Option | string)[];
  values: string[] | null | undefined;
  onChange: (values: string[]) => void;
  max?: number;
}

export function MultiChipSelect({ label, hint, options, values, onChange, max }: MultiChipSelectProps) {
  const selected = values ?? [];
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else if (!max || selected.length < max) onChange([...selected, v]);
  };
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} /> : null}
      {hint ? <Text style={[styles.hint, { marginTop: 0, marginBottom: 6 }]}>{hint}</Text> : null}
      <View style={styles.chips}>
        {toOptions(options).map((o) => {
          const isOn = selected.includes(o.value);
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.chip, isOn && styles.chipSelected]}
              onPress={() => toggle(o.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, isOn && styles.chipTextSelected]}>
                {isOn ? '✓ ' : ''}
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface PickerFieldProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  options: (Option | string)[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  searchable?: boolean;
}

/** Dropdown-style field that opens a searchable list (for long lists like countries). */
export function PickerField({ label, required, placeholder, options, value, onChange, searchable }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const list = toOptions(options);
  const selected = list.find((o) => o.value === value);
  const filtered = query ? list.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : list;

  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <TouchableOpacity style={styles.input} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.pickerText, !selected && { color: Colors.textMuted }]}>
          {selected?.label ?? value ?? placeholder ?? 'Select'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            {searchable ? (
              <TextInput
                placeholder="Search"
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                style={[styles.input, { marginHorizontal: Spacing.md, marginBottom: Spacing.sm }]}
              />
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={[styles.optionText, item.value === value && { color: Colors.secondary, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  {item.value === value ? <Text style={{ color: Colors.secondary }}>✓</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export function Stepper({ label, value, min, max, step = 1, format, onChange }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{format ? format(value) : value}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.hint}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  required: { color: Colors.primaryLight },
  hint: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  pickerText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },
  chevron: { color: Colors.textMuted, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    maxHeight: '75%',
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  modalClose: { color: Colors.secondary, fontSize: FontSize.md, fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionText: { color: Colors.textPrimary, fontSize: FontSize.md },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  stepperLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  stepperValue: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', minWidth: 70, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  toggleLabel: { color: Colors.textPrimary, fontSize: FontSize.md },
  switchTrack: { width: 46, height: 26, borderRadius: 13, backgroundColor: Colors.border, padding: 3 },
  switchTrackOn: { backgroundColor: Colors.primary },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.textMuted },
  switchThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  sectionTitle: { color: Colors.secondary, fontSize: FontSize.lg, fontWeight: '700' },
});
