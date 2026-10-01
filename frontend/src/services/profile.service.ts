import { api } from './api';
import type { AppUser, MatrimonyProfile, PartnerPreferences } from '../store/auth.store';

export interface UserPhoto {
  id: string;
  url: string;
  order: number;
  isPrimary: boolean;
}

export type InterestStatus = 'pending' | 'accepted' | 'declined';

/** Compact card data returned by list endpoints (search, interests, shortlist, visitors). */
export interface ProfileSummary {
  id: string;
  name: string;
  gender: string;
  age: number | null;
  heightCm: number | null;
  maritalStatus: string | null;
  religion: string | null;
  community: string | null;
  motherTongue: string | null;
  educationLevel: string | null;
  occupation: string | null;
  annualIncome: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  residencyStatus: string | null;
  nativeState: string | null;
  profileCreatedBy: string | null;
  bio: string | null;
  photoVerifiedStatus: string;
  isPremium: boolean;
  lastActiveAt: string | null;
  primaryPhoto: string | null;
}

export interface InterestListItem extends ProfileSummary {
  likedAt?: string;
  matchedAt?: string;
  interestMessage?: string | null;
  interestStatus: InterestStatus;
}

export interface PreferenceCheck {
  key: string;
  label: string;
  matched: boolean;
}

export interface MatchScore {
  matched: number;
  total: number;
  percent: number;
  checks: PreferenceCheck[];
}

export interface MemberProfile extends MatrimonyProfile {
  id: string;
  name: string;
  isPremium: boolean;
  lastActiveAt?: string | null;
  createdAt?: string;
  photos: UserPhoto[];
  primaryPhoto: string | null;
  interestSent: boolean;
  interestSentStatus: InterestStatus | null;
  interestReceived: boolean;
  interestReceivedMessage: string | null;
  declinedByMe: boolean;
  isConnected: boolean;
  isShortlisted: boolean;
  contact: { phone: string | null; email: string | null } | null;
  contactLocked: boolean;
  theyMatchYourPreferences: MatchScore | null;
  youMatchTheirPreferences: MatchScore | null;
}

export interface Paginated<T> {
  users: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type ProfileFormValues = Partial<MatrimonyProfile> & {
  email?: string;
  showContactToConnections?: boolean;
  referredByCode?: string;
};

const ProfileService = {
  async saveProfile(values: ProfileFormValues): Promise<AppUser> {
    const { data } = await api.patch<AppUser>('/users/profile/stage1', values);
    return data;
  },

  async savePartnerPreferences(partnerPreferences: PartnerPreferences): Promise<PartnerPreferences> {
    const { data } = await api.patch<{ partnerPreferences: PartnerPreferences }>(
      '/users/profile/preferences',
      { partnerPreferences },
    );
    return data.partnerPreferences;
  },

  async getMe(): Promise<AppUser> {
    const { data } = await api.get<AppUser>('/auth/me');
    return data;
  },

  async getFullProfile(userId: string): Promise<MemberProfile> {
    const { data } = await api.get<MemberProfile>(`/likes/profile/${userId}`);
    return data;
  },

  /** Send an interest, accept a received one, or withdraw a sent one (toggle). */
  async toggleInterest(userId: string, message?: string): Promise<{ liked: boolean; isMatch: boolean }> {
    const { data } = await api.post(`/likes/${userId}`, message ? { message } : {});
    return data;
  },

  async declineInterest(userId: string): Promise<void> {
    await api.post(`/likes/${userId}/decline`);
  },

  async getSentInterests(page = 1, limit = 20): Promise<Paginated<InterestListItem>> {
    const { data } = await api.get('/likes/you-liked', { params: { page, limit } });
    return data;
  },

  async getReceivedInterests(page = 1, limit = 20): Promise<Paginated<InterestListItem>> {
    const { data } = await api.get('/likes/liked-by', { params: { page, limit } });
    return data;
  },

  async getConnections(page = 1, limit = 20): Promise<Paginated<InterestListItem>> {
    const { data } = await api.get('/likes/matches', { params: { page, limit } });
    return data;
  },

  async getUnseenInterestCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/likes/liked-by/unseen-count');
    return data.count;
  },

  async markInterestsSeen(): Promise<void> {
    await api.post('/likes/liked-by/mark-seen');
  },

  async toggleShortlist(userId: string): Promise<{ shortlisted: boolean }> {
    const { data } = await api.post(`/shortlist/${userId}`);
    return data;
  },

  async getShortlist(page = 1, limit = 20): Promise<Paginated<ProfileSummary & { shortlistedAt: string }>> {
    const { data } = await api.get('/shortlist', { params: { page, limit } });
    return data;
  },

  async getProfileVisitors(page = 1, limit = 20): Promise<Paginated<ProfileSummary & { viewedAt: string }>> {
    const { data } = await api.get('/users/profile-visitors', { params: { page, limit } });
    return data;
  },

  async getReferralCode(): Promise<string> {
    const { data } = await api.get<{ referralCode: string }>('/users/referral-code');
    return data.referralCode;
  },

  async reportUser(userId: string, reason: string, description?: string, reportedPhotoId?: string) {
    const { data } = await api.post(`/reports/${userId}`, { reason, description, reportedPhotoId });
    return data;
  },
};

export default ProfileService;
