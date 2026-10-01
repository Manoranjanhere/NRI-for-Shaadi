import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';
import { useFeatureFlagsStore } from '../store/featureFlags.store';
import { hasPremiumAccess, showPremiumRequiredAlert } from '../utils/subscription';

/** Whether the signed-in member can send interests/messages, plus a guard that prompts to upgrade. */
export function useInteractionAccess() {
  const user = useAuthStore((s) => s.user);
  const paidFeaturesDisabled = useFeatureFlagsStore((s) => s.paidFeaturesDisabled);
  const navigation = useNavigation<any>();
  const canInteract = hasPremiumAccess(user, paidFeaturesDisabled);

  const requireAccess = useCallback(
    (feature?: string) => {
      if (canInteract) return true;
      showPremiumRequiredAlert(navigation, feature);
      return false;
    },
    [canInteract, navigation],
  );

  return { canInteract, requireAccess };
}
