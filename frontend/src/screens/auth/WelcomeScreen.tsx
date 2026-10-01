import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';

import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { GOOGLE_WEB_CLIENT_ID, isGoogleSignInConfigured } from '../../config/google.config';
import AuthService from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import type { WelcomeScreenProps } from '../../navigation/types';
import BrandLogo from '../../components/brand/BrandLogo';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

const PRIVACY_POLICY_URL = 'https://api.sugarbf.club/api/v1/privacy';

const HIGHLIGHTS: [string, string][] = [
  ['🌍', 'NRI brides & grooms in USA, UK, Canada, UAE, Australia & more'],
  ['🛡️', 'Photo-verified profiles and contact details kept private'],
  ['🎁', '1 month free, then ₹300/month — same for brides & grooms'],
];

type Props = WelcomeScreenProps;

export default function WelcomeScreen({ navigation }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);

  const confirmGoogleAccount = (email?: string): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        'Continue with this account?',
        email || 'Selected Google account',
        [
          { text: 'Choose Another', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  const handleAuthSuccess = async (response: any) => {
    setToken(response.accessToken);
    setUser(response.user);

    // Register device for push
    await AuthService.registerDevice();

    if (response.isNewUser || response.user.profileStage === 0) {
      navigation.replace('Stage1');
    } else if (response.user.profileStage === 1) {
      navigation.replace('Stage2');
    } else {
      navigation.replace('Main');
    }
  };

  // ─── Google Sign In ───────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!isGoogleSignInConfigured) {
      Alert.alert('Google sign in unavailable', 'Please continue with your phone number.');
      return;
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const previousUser = await GoogleSignin.getCurrentUser();
      if (previousUser) {
        await GoogleSignin.signOut();
      }

      const signInResult: any = await GoogleSignin.signIn();
      if (signInResult?.type === 'cancelled') {
        return;
      }

      const user = signInResult?.data?.user ?? signInResult?.user;
      const email = user?.email;

      const shouldContinue = await confirmGoogleAccount(email);
      if (!shouldContinue) {
        await GoogleSignin.signOut();
        return;
      }

      let idToken =
        signInResult?.data?.idToken ?? signInResult?.idToken ?? user?.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        throw new Error('Google did not return an ID token. Check webClientId in google.config.ts');
      }

      const res = await AuthService.socialAuth('google', idToken);
      await handleAuthSuccess(res);
    } catch (err: any) {
      console.error('[Google] Auth failed:', err?.code, err?.message, err?.response?.data);
      Alert.alert(
        'Google sign in failed',
        err?.response?.data?.message || err?.message || 'Please try again.',
      );
    }
  };

  // ─── Apple Sign In ────────────────────────────────────────────────────────
  const handleApple = async () => {
    try {
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      const { identityToken } = appleAuthResponse;
      if (!identityToken) return;
      const res = await AuthService.socialAuth('apple', identityToken);
      await handleAuthSuccess(res);
    } catch (err: any) {
      if (err.code !== appleAuth.Error.CANCELED) {
        console.error('[Apple] Auth failed:', err.message);
        Alert.alert('Apple sign in failed', err?.response?.data?.message || err?.message || 'Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero gradient background */}
      <LinearGradient
        colors={['#12090B', '#4A0A1C', Colors.primary]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      />

      {/* Logo & tagline */}
      <View style={styles.heroSection}>
        <BrandLogo variant="stacked" size={96} tagline="Matrimony for Indians around the world" />
        <View style={styles.highlights}>
          {HIGHLIGHTS.map(([icon, text]) => (
            <View key={text} style={styles.highlightRow}>
              <Text style={styles.highlightIcon}>{icon}</Text>
              <Text style={styles.highlightText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Auth buttons */}
      <View style={styles.buttonsContainer}>
        {/* Phone OTP */}
        <TouchableOpacity
          style={[styles.button, styles.phoneButton]}
          onPress={() => navigation.navigate('PhoneEntry')}
          activeOpacity={0.85}
        >
          <Text style={styles.phoneIcon}>📱</Text>
          <Text style={styles.buttonText}>Continue with Phone</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {/* Google */}
        <TouchableOpacity
          style={[styles.button, styles.socialButton]}
          onPress={handleGoogle}
          activeOpacity={0.85}
        >
          <Text style={styles.socialIcon}>G</Text>
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Apple (iOS only) */}
        {appleAuth.isSupported && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleApple}
            activeOpacity={0.85}
          >
            <Text style={[styles.socialIcon, { color: '#fff' }]}></Text>
            <Text style={[styles.socialButtonText, { color: '#fff' }]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
          <Text
            style={styles.termsLink}
            accessibilityRole="link"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { ...StyleSheet.absoluteFillObject },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  highlights: { marginTop: Spacing.xl, gap: Spacing.sm, alignSelf: 'stretch' },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  highlightIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  highlightText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 19, opacity: 0.9 },
  buttonsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  phoneButton: {
    backgroundColor: Colors.secondary,
  },
  buttonText: {
    color: '#2B0510',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  phoneIcon: { fontSize: 18 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: FontSize.sm },
  socialButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appleButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    width: 22,
    textAlign: 'center',
  },
  socialButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  terms: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  termsLink: { color: Colors.secondaryLight, fontWeight: '600' },
});
