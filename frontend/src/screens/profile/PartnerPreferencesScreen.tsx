import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { useAuthStore, type PartnerPreferences } from '../../store/auth.store';
import ProfileService from '../../services/profile.service';
import PartnerPreferencesForm, { defaultPreferences } from '../../components/profile/PartnerPreferencesForm';
import { ageFromDob } from '../../constants/profileOptions';
import { errorMessage } from '../../utils/subscription';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PartnerPreferences'>;

export default function PartnerPreferencesScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [prefs, setPrefs] = useState<PartnerPreferences>(
    user?.partnerPreferences ?? defaultPreferences(user?.gender, ageFromDob(user?.dateOfBirth), user?.religion),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await ProfileService.savePartnerPreferences(prefs);
      updateUser({ partnerPreferences: saved });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Partner preferences</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Your “Recommended” matches are ranked by how well they fit these preferences. Profiles outside them are still
          shown, just lower down.
        </Text>
        <PartnerPreferencesForm value={prefs} onChange={setPrefs} />
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save preferences</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  back: { color: Colors.textPrimary, fontSize: 34, lineHeight: 36, width: 40 },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  footer: { padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
