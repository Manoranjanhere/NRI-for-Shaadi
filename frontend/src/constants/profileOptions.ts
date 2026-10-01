export interface Option<T extends string = string> {
  value: T;
  label: string;
}

const opts = <T extends string>(pairs: [T, string][]): Option<T>[] =>
  pairs.map(([value, label]) => ({ value, label }));

export const PROFILE_CREATED_BY = opts([
  ['self', 'Myself'],
  ['parent', 'Parent'],
  ['sibling', 'Sibling'],
  ['relative', 'Relative'],
  ['friend', 'Friend'],
]);

/** Same values as PROFILE_CREATED_BY, worded from the creator's point of view for onboarding. */
export const PROFILE_FOR = opts([
  ['self', 'Myself'],
  ['parent', 'My son / daughter'],
  ['sibling', 'My brother / sister'],
  ['relative', 'A relative'],
  ['friend', 'A friend'],
]);

export const GENDERS = opts([
  ['female', 'Bride (Female)'],
  ['male', 'Groom (Male)'],
]);

export const MARITAL_STATUSES = opts([
  ['never_married', 'Never married'],
  ['divorced', 'Divorced'],
  ['widowed', 'Widowed'],
  ['awaiting_divorce', 'Awaiting divorce'],
  ['annulled', 'Annulled'],
]);

export const HAS_CHILDREN = opts([
  ['no', 'No children'],
  ['yes_living_together', 'Yes, living with me'],
  ['yes_not_living_together', 'Yes, not living with me'],
]);

export const RELIGIONS = opts([
  ['hindu', 'Hindu'],
  ['muslim', 'Muslim'],
  ['sikh', 'Sikh'],
  ['christian', 'Christian'],
  ['jain', 'Jain'],
  ['buddhist', 'Buddhist'],
  ['parsi', 'Parsi'],
  ['jewish', 'Jewish'],
  ['spiritual', 'Spiritual'],
  ['no_religion', 'No religion'],
  ['other', 'Other'],
]);

export const COMMUNITY_SUGGESTIONS: Record<string, string[]> = {
  hindu: ['Brahmin', 'Kshatriya', 'Rajput', 'Agarwal', 'Baniya', 'Kayastha', 'Maratha', 'Jat', 'Khatri', 'Arora', 'Patel', 'Reddy', 'Kamma', 'Nair', 'Iyer', 'Iyengar', 'Yadav', 'Gupta', 'Lingayat', 'Vokkaliga', 'Ezhava', 'Kurmi'],
  sikh: ['Jat', 'Khatri', 'Arora', 'Ramgarhia', 'Saini', 'Ahluwalia', 'Kamboj', 'Labana'],
  muslim: ['Sunni', 'Shia', 'Syed', 'Pathan', 'Sheikh', 'Ansari', 'Memon', 'Bohra', 'Khoja'],
  christian: ['Catholic', 'Protestant', 'Syrian Christian', 'Orthodox', 'Pentecostal', 'CSI', 'Marthoma'],
  jain: ['Shwetambar', 'Digambar', 'Oswal', 'Porwal', 'Agarwal Jain'],
  buddhist: ['Mahayana', 'Theravada', 'Neo-Buddhist'],
  parsi: ['Irani', 'Parsi'],
};

export const MOTHER_TONGUES = [
  'Hindi', 'Punjabi', 'Gujarati', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
  'Urdu', 'Odia', 'Sindhi', 'Konkani', 'Kashmiri', 'Assamese', 'Marwari', 'Rajasthani', 'Bhojpuri',
  'Haryanvi', 'Tulu', 'Nepali', 'English', 'Other',
];

export const MANGLIK = opts([
  ['no', 'Non-manglik'],
  ['yes', 'Manglik'],
  ['partial', 'Anshik (partial)'],
  ['dont_know', "Don't know"],
]);

export const RASHIS = [
  'Mesh (Aries)', 'Vrishabh (Taurus)', 'Mithun (Gemini)', 'Kark (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
  'Tula (Libra)', 'Vrishchik (Scorpio)', 'Dhanu (Sagittarius)', 'Makar (Capricorn)', 'Kumbh (Aquarius)', 'Meen (Pisces)',
];

/** Top NRI destinations first. */
export const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'United Arab Emirates', 'Singapore',
  'New Zealand', 'Germany', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Ireland',
  'Netherlands', 'France', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Italy', 'Spain', 'Belgium',
  'Austria', 'Poland', 'Malaysia', 'Hong Kong', 'Japan', 'South Korea', 'South Africa', 'Kenya',
  'Mauritius', 'Fiji', 'Trinidad and Tobago', 'Guyana', 'Israel', 'India', 'Other',
];

export const RESIDENCY_STATUSES = opts([
  ['citizen', 'Citizen'],
  ['permanent_resident', 'Permanent resident / Green card'],
  ['work_visa', 'Work visa (H1B, etc.)'],
  ['student_visa', 'Student visa'],
  ['dependent_visa', 'Dependent visa'],
  ['other', 'Other'],
]);

export const RELOCATE_OPTIONS = opts([
  ['yes', 'Yes'],
  ['maybe', 'Maybe / open to discuss'],
  ['no', 'No'],
]);

export const EDUCATION_LEVELS = opts([
  ['high_school', 'High school'],
  ['diploma', 'Diploma'],
  ['bachelors', "Bachelor's"],
  ['masters', "Master's"],
  ['doctorate', 'Doctorate / PhD'],
  ['professional', 'Professional (MD, CA, LLB…)'],
]);

export const WORK_SECTORS = opts([
  ['private', 'Private company'],
  ['government', 'Government / Public sector'],
  ['business', 'Business'],
  ['self_employed', 'Self-employed / Freelancer'],
  ['student', 'Student'],
  ['not_working', 'Not working'],
]);

export const INCOME_BRACKETS = opts([
  ['undisclosed', 'Prefer not to say'],
  ['lt_25k', 'Under $25k'],
  ['25k_50k', '$25k – $50k'],
  ['50k_75k', '$50k – $75k'],
  ['75k_100k', '$75k – $100k'],
  ['100k_150k', '$100k – $150k'],
  ['150k_200k', '$150k – $200k'],
  ['200k_plus', '$200k+'],
]);

export const DIETS = opts([
  ['vegetarian', 'Vegetarian'],
  ['non_vegetarian', 'Non-vegetarian'],
  ['eggetarian', 'Eggetarian'],
  ['vegan', 'Vegan'],
  ['jain', 'Jain food'],
]);

export const HABIT_OPTIONS = opts([
  ['no', 'No'],
  ['occasionally', 'Occasionally'],
  ['yes', 'Yes'],
]);

export const FAMILY_TYPES = opts([
  ['nuclear', 'Nuclear'],
  ['joint', 'Joint'],
]);

export const FAMILY_VALUES = opts([
  ['traditional', 'Traditional'],
  ['moderate', 'Moderate'],
  ['liberal', 'Liberal'],
]);

export const FAMILY_STATUSES = opts([
  ['middle_class', 'Middle class'],
  ['upper_middle_class', 'Upper middle class'],
  ['rich', 'Rich'],
  ['affluent', 'Affluent'],
]);

export const HOBBIES = [
  'Travelling', 'Cooking', 'Reading', 'Music', 'Singing', 'Dancing', 'Movies', 'Cricket', 'Fitness',
  'Yoga', 'Hiking', 'Photography', 'Art', 'Gaming', 'Volunteering', 'Gardening', 'Writing', 'Spirituality',
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Other',
];

export const MIN_AGE = 18;
export const MAX_AGE = 75;
export const MIN_HEIGHT_CM = 137; // 4'6"
export const MAX_HEIGHT_CM = 213; // 7'0"

export function cmToFeetInches(cm?: number | null): string {
  if (!cm) return '';
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export const HEIGHT_OPTIONS: Option[] = (() => {
  const list: Option[] = [];
  for (let inches = 54; inches <= 84; inches += 1) {
    const cm = Math.round(inches * 2.54);
    list.push({ value: String(cm), label: `${Math.floor(inches / 12)}'${inches % 12}" (${cm} cm)` });
  }
  return list;
})();

const ALL_LABELS: Record<string, string> = Object.fromEntries(
  [
    PROFILE_CREATED_BY, MARITAL_STATUSES, HAS_CHILDREN, RELIGIONS, MANGLIK, RESIDENCY_STATUSES,
    RELOCATE_OPTIONS, EDUCATION_LEVELS, WORK_SECTORS, DIETS, FAMILY_TYPES, FAMILY_VALUES, FAMILY_STATUSES,
  ].flatMap((list) => list.map((o) => [o.value, o.label])),
);

/** Human label for an option value; income and habits use their own lists to avoid key clashes. */
export function labelFor(value?: string | null, list?: Option[]): string {
  if (!value) return '';
  if (list) return list.find((o) => o.value === value)?.label ?? value;
  return ALL_LABELS[value] ?? value;
}

export function incomeLabel(value?: string | null): string {
  return labelFor(value, INCOME_BRACKETS);
}

export function habitLabel(value?: string | null): string {
  return labelFor(value, HABIT_OPTIONS);
}

export function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}
