import { create } from 'zustand';
import AuthService from '../services/auth.service';
import { storage } from '../services/api';

export type ProfileStage = 0 | 1 | 2 | 3;

export interface PartnerPreferences {
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  maritalStatuses?: string[];
  religions?: string[];
  communities?: string[];
  motherTongues?: string[];
  countries?: string[];
  educationLevels?: string[];
  diets?: string[];
  manglik?: 'any' | 'no' | 'yes';
  about?: string;
}

/** Matrimony profile fields shared by the signed-in user and other members' profiles. */
export interface MatrimonyProfile {
  profileCreatedBy?: string | null;
  name?: string;
  gender?: string;
  dateOfBirth?: string | null;
  age?: number | null;
  heightCm?: number | null;
  maritalStatus?: string | null;
  hasChildren?: string | null;
  religion?: string | null;
  community?: string | null;
  subCommunity?: string | null;
  gotra?: string | null;
  casteNoBar?: boolean;
  motherTongue?: string | null;
  manglik?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  rashi?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  citizenship?: string | null;
  residencyStatus?: string | null;
  grewUpIn?: string | null;
  nativeState?: string | null;
  nativeCity?: string | null;
  willingToRelocate?: string | null;
  educationLevel?: string | null;
  educationField?: string | null;
  college?: string | null;
  occupation?: string | null;
  employer?: string | null;
  workSector?: string | null;
  annualIncome?: string | null;
  diet?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  hobbies?: string[] | null;
  familyType?: string | null;
  familyValues?: string | null;
  familyStatus?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  brothers?: number | null;
  sisters?: number | null;
  familyLocation?: string | null;
  aboutFamily?: string | null;
  bio?: string | null;
  partnerPreferences?: PartnerPreferences | null;
  photoVerifiedStatus?: string;
}

export interface AppUser extends MatrimonyProfile {
  id: string;
  phone?: string;
  email?: string;
  showContactToConnections?: boolean;
  hiddenUntil?: string | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  accountWarningMessage?: string | null;
  accountWarningAt?: string | null;
  subscriptionTier?: number;
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: string | null;
  trialEndsAt?: string | null;
  profileStage: ProfileStage;
  isVerified: boolean;
  referralCode?: string;
  referredByCode?: string | null;
}

interface AuthState {
  user: AppUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: AppUser) => void;
  setToken: (token: string) => void;
  updateUser: (partial: Partial<AppUser>) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setUser: (user) => {
    storage.set('user', JSON.stringify(user));
    set({ user });
  },
  setToken: (accessToken) => {
    storage.set('accessToken', accessToken);
    set({ accessToken });
  },

  updateUser: (partial) =>
    set((state) => {
      const user = state.user ? { ...state.user, ...partial } : null;
      if (user) {
        storage.set('user', JSON.stringify(user));
      }
      return { user };
    }),

  logout: () => {
    AuthService.clearSession();
    set({ user: null, accessToken: null });
  },

  hydrate: () => {
    try {
      const user = AuthService.getStoredUser() as AppUser | null;
      const accessToken = AuthService.isLoggedIn()
        ? require('../services/api').storage.getString('accessToken')
        : null;
      set({ user, accessToken, isLoading: false });
    } catch (e) {
      console.warn('[hydrate] failed:', e);
      set({ user: null, accessToken: null, isLoading: false });
    }
  },
}));
