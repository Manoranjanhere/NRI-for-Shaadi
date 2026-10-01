import React, { useEffect, useRef } from 'react';
import { AppState, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '../store/auth.store';
import { useLocaleStore } from '../store/locale.store';
import { useFeatureFlagsStore } from '../store/featureFlags.store';
import { useBadgeStore } from '../store/badges.store';
import { Colors } from '../theme';
import type { MainTabParamList, RootStackParamList } from './types';

export type { RootStackParamList, MainTabParamList } from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import Stage1Screen from '../screens/onboarding/Stage1Screen';
import Stage2PhotosScreen from '../screens/onboarding/Stage2PhotosScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import InterestsScreen from '../screens/profile/InterestsScreen';
import InboxScreen from '../screens/messages/InboxScreen';
import MyAccountScreen from '../screens/account/MyAccountScreen';
import ProfileDetailScreen from '../screens/profile/ProfileDetailScreen';
import ProfileListScreen from '../screens/profile/ProfileListScreen';
import PartnerPreferencesScreen from '../screens/profile/PartnerPreferencesScreen';
import SubscriptionScreen from '../screens/subscription/SubscriptionScreen';
import PhotoVerificationScreen from '../screens/verification/PhotoVerificationScreen';
import AccountSettingsScreen from '../screens/settings/AccountSettingsScreen';
import ChatConversationScreen from '../screens/messages/ChatConversationScreen';
import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import NotificationHandler from '../components/notifications/NotificationHandler';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Matches: '💍',
  Interests: '💌',
  Chats: '💬',
  Account: '👤',
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.secondary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.primary,
  },
};

function TabIcon({ name, focused }: { name: keyof MainTabParamList; focused: boolean }) {
  return <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.55 }]}>{TAB_ICONS[name]}</Text>;
}

function MainTabs() {
  const unseenInterests = useBadgeStore((s) => s.unseenInterests);
  const unreadMessages = useBadgeStore((s) => s.unreadMessages);

  useEffect(() => {
    const refresh = () => useBadgeStore.getState().refresh();
    refresh();
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const badge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBadgeStyle: styles.tabBadge,
      })}
      screenListeners={{ focus: () => useBadgeStore.getState().refresh() }}
    >
      <Tab.Screen name="Matches" component={DiscoverScreen} />
      <Tab.Screen name="Interests" component={InterestsScreen} options={{ tabBarBadge: badge(unseenInterests) }} />
      <Tab.Screen name="Chats" component={InboxScreen} options={{ tabBarBadge: badge(unreadMessages) }} />
      <Tab.Screen name="Account" component={MyAccountScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading, hydrate } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    hydrate();
    useFeatureFlagsStore.getState().fetchFlags();
  }, []);

  useEffect(() => {
    if (user) {
      useFeatureFlagsStore.getState().fetchFlags();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.country) {
      useLocaleStore.getState().syncFromProfile(user.country);
    }
  }, [user?.country]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.secondary} size="large" />
      </View>
    );
  }

  const initialRoute: keyof RootStackParamList = !user
    ? 'Welcome'
    : user.profileStage === 0
      ? 'Stage1'
      : user.profileStage === 1
        ? 'Stage2'
        : 'Main';

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <NotificationHandler navigationRef={navigationRef} />
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
        <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />

        <Stack.Screen name="Stage1" component={Stage1Screen} />
        <Stack.Screen name="Stage2" component={Stage2PhotosScreen} />

        <Stack.Screen name="Main" component={MainTabs} />

        <Stack.Screen name="EditProfile" component={Stage1Screen} />
        <Stack.Screen name="PartnerPreferences" component={PartnerPreferencesScreen} />
        <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Shortlist" component={ProfileListScreen} />
        <Stack.Screen name="ProfileVisitors" component={ProfileListScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="PhotoVerification" component={PhotoVerificationScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  tabIcon: { fontSize: 20 },
  tabBadge: { backgroundColor: Colors.primary, color: '#fff', fontSize: 10 },
});
