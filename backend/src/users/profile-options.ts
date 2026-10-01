// Closed option sets for matrimony profiles. Keep in sync with
// frontend/src/constants/profileOptions.ts (values only — labels live in the app).

export const PROFILE_CREATED_BY = ['self', 'parent', 'sibling', 'relative', 'friend'] as const;

export const MARITAL_STATUSES = [
  'never_married',
  'divorced',
  'widowed',
  'awaiting_divorce',
  'annulled',
] as const;

export const HAS_CHILDREN = ['no', 'yes_living_together', 'yes_not_living_together'] as const;

export const RELIGIONS = [
  'hindu',
  'muslim',
  'sikh',
  'christian',
  'jain',
  'buddhist',
  'parsi',
  'jewish',
  'spiritual',
  'no_religion',
  'other',
] as const;

export const MANGLIK = ['no', 'yes', 'partial', 'dont_know'] as const;

export const RESIDENCY_STATUSES = [
  'citizen',
  'permanent_resident',
  'work_visa',
  'student_visa',
  'dependent_visa',
  'other',
] as const;

export const RELOCATE_OPTIONS = ['yes', 'no', 'maybe'] as const;

export const EDUCATION_LEVELS = [
  'high_school',
  'diploma',
  'bachelors',
  'masters',
  'doctorate',
  'professional',
] as const;

export const WORK_SECTORS = [
  'private',
  'government',
  'business',
  'self_employed',
  'not_working',
  'student',
] as const;

/** Annual income brackets in USD equivalent — NRIs earn in many currencies. */
export const INCOME_BRACKETS = [
  'undisclosed',
  'lt_25k',
  '25k_50k',
  '50k_75k',
  '75k_100k',
  '100k_150k',
  '150k_200k',
  '200k_plus',
] as const;

export const DIETS = ['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan', 'jain'] as const;

export const HABIT_OPTIONS = ['no', 'occasionally', 'yes'] as const;

export const FAMILY_TYPES = ['nuclear', 'joint'] as const;

export const FAMILY_VALUES = ['traditional', 'moderate', 'liberal'] as const;

export const FAMILY_STATUSES = ['middle_class', 'upper_middle_class', 'rich', 'affluent'] as const;

export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 230;
export const MIN_AGE = 18;
export const MAX_AGE = 75;

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
  manglik?: string;
  about?: string;
}

/** Whole years between dateOfBirth and today. */
export function ageFromDateOfBirth(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}
