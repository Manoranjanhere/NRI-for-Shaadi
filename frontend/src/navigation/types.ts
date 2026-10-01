import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type InterestsTab = 'received' | 'sent' | 'connections';

export type MainTabParamList = {
  Matches: undefined;
  Interests: { tab?: InterestsTab } | undefined;
  Chats: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  Stage1: undefined;
  Stage2: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  EditProfile: undefined;
  PartnerPreferences: undefined;
  ProfileDetail: { userId: string };
  Shortlist: undefined;
  ProfileVisitors: undefined;
  Subscription: undefined;
  PhotoVerification: undefined;
  AccountSettings: undefined;
  AdminPanel: undefined;
  ChatConversation: { userId: string; userName?: string };
};

// Typed props for every screen — import these in each screen file
export type WelcomeScreenProps        = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
export type PhoneEntryScreenProps     = NativeStackScreenProps<RootStackParamList, 'PhoneEntry'>;
export type OtpVerifyScreenProps      = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;
export type Stage1ScreenProps         = NativeStackScreenProps<RootStackParamList, 'Stage1'>;
export type Stage2ScreenProps         = NativeStackScreenProps<RootStackParamList, 'Stage2'>;
export type ProfileDetailScreenProps  = NativeStackScreenProps<RootStackParamList, 'ProfileDetail'>;
export type SubscriptionScreenProps   = NativeStackScreenProps<RootStackParamList, 'Subscription'>;
export type PhotoVerificationProps    = NativeStackScreenProps<RootStackParamList, 'PhotoVerification'>;
export type AccountSettingsProps      = NativeStackScreenProps<RootStackParamList, 'AccountSettings'>;
export type AdminPanelProps           = NativeStackScreenProps<RootStackParamList, 'AdminPanel'>;
export type ChatConversationProps     = NativeStackScreenProps<RootStackParamList, 'ChatConversation'>;
