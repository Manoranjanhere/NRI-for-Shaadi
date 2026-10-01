import { User } from './entities/user.entity';
import { ageFromDateOfBirth } from './profile-options';

/** Compact card data safe to show any member (lists, search results, interests). */
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
  lastActiveAt: Date | null;
  primaryPhoto: string | null;
}

export function displayAge(user: Pick<User, 'dateOfBirth' | 'age'>): number | null {
  return ageFromDateOfBirth(user.dateOfBirth) ?? user.age ?? null;
}

export function toProfileSummary(user: User, primaryPhoto: string | null): ProfileSummary {
  return {
    id: user.id,
    name: user.name || 'Member',
    gender: user.gender,
    age: displayAge(user),
    heightCm: user.heightCm ?? null,
    maritalStatus: user.maritalStatus ?? null,
    religion: user.religion ?? null,
    community: user.community ?? null,
    motherTongue: user.motherTongue ?? null,
    educationLevel: user.educationLevel ?? null,
    occupation: user.occupation ?? null,
    annualIncome: user.annualIncome ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    country: user.country ?? null,
    residencyStatus: user.residencyStatus ?? null,
    nativeState: user.nativeState ?? null,
    profileCreatedBy: user.profileCreatedBy ?? null,
    bio: user.bio ?? null,
    photoVerifiedStatus: user.photoVerifiedStatus,
    isPremium: (user.subscriptionTier ?? 0) > 0,
    lastActiveAt: user.lastActiveAt ?? null,
    primaryPhoto,
  };
}

const PRIVATE_FIELDS: (keyof User)[] = [
  'phone',
  'email',
  'googleId',
  'facebookId',
  'appleId',
  'stripeCustomerId',
  'selfieS3Key',
  'faceMatchConfidence',
  'referralCode',
  'referredByCode',
  'coins',
  'lastDailyRewardAt',
  'dailyMsgCount',
  'dailyMsgResetAt',
  'dailySuperLikeCount',
  'dailySuperLikeResetAt',
  'dailyComplimentCount',
  'dailyComplimentResetAt',
  'extraMsgCredits',
  'extraSuperLikeCredits',
  'latitude',
  'longitude',
  'locationUpdatedAt',
  'isAdmin',
  'isSuperAdmin',
  'isBanned',
  'accountWarningMessage',
  'accountWarningAt',
  'likedBySeenAt',
  'trialEndsAt',
  'subscriptionExpiresAt',
  'hiddenUntil',
  'deletedAt',
];

/** Full profile for another member's view — everything except private/account fields. */
export function toPublicProfile(user: User): Record<string, unknown> {
  const out: Record<string, unknown> = { ...user };
  for (const field of PRIVATE_FIELDS) delete out[field];
  out.age = displayAge(user);
  out.isPremium = (user.subscriptionTier ?? 0) > 0;
  return out;
}
