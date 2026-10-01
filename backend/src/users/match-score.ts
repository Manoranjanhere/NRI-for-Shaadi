import { User } from './entities/user.entity';
import { PartnerPreferences } from './profile-options';
import { displayAge } from './profile-summary';

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

const norm = (v: string | null | undefined) => (v || '').trim().toLowerCase();
const inList = (list: string[] | undefined, value: string | null | undefined) =>
  !!value && (list || []).some((item) => norm(item) === norm(value));

/** How well `candidate` fits the partner preferences of someone else. Unset preferences are skipped. */
export function scoreAgainstPreferences(
  prefs: PartnerPreferences | null | undefined,
  candidate: User,
): MatchScore {
  const checks: PreferenceCheck[] = [];
  if (prefs) {
    const age = displayAge(candidate);
    if (prefs.minAge || prefs.maxAge) {
      checks.push({
        key: 'age',
        label: 'Age',
        matched: age !== null && age >= (prefs.minAge ?? 0) && age <= (prefs.maxAge ?? 200),
      });
    }
    if (prefs.minHeightCm || prefs.maxHeightCm) {
      const h = candidate.heightCm;
      checks.push({
        key: 'height',
        label: 'Height',
        matched: !!h && h >= (prefs.minHeightCm ?? 0) && h <= (prefs.maxHeightCm ?? 999),
      });
    }
    if (prefs.maritalStatuses?.length) {
      checks.push({ key: 'maritalStatus', label: 'Marital status', matched: inList(prefs.maritalStatuses, candidate.maritalStatus) });
    }
    if (prefs.religions?.length) {
      checks.push({ key: 'religion', label: 'Religion', matched: inList(prefs.religions, candidate.religion) });
    }
    if (prefs.communities?.length) {
      checks.push({
        key: 'community',
        label: 'Community',
        matched: inList(prefs.communities, candidate.community) || candidate.casteNoBar,
      });
    }
    if (prefs.motherTongues?.length) {
      checks.push({ key: 'motherTongue', label: 'Mother tongue', matched: inList(prefs.motherTongues, candidate.motherTongue) });
    }
    if (prefs.countries?.length) {
      checks.push({ key: 'country', label: 'Country living in', matched: inList(prefs.countries, candidate.country) });
    }
    if (prefs.educationLevels?.length) {
      checks.push({ key: 'education', label: 'Education', matched: inList(prefs.educationLevels, candidate.educationLevel) });
    }
    if (prefs.diets?.length) {
      checks.push({ key: 'diet', label: 'Diet', matched: inList(prefs.diets, candidate.diet) });
    }
    if (prefs.manglik && prefs.manglik !== 'any') {
      const isManglik = candidate.manglik === 'yes' || candidate.manglik === 'partial';
      checks.push({
        key: 'manglik',
        label: 'Manglik',
        matched: prefs.manglik === 'yes' ? isManglik : candidate.manglik === 'no',
      });
    }
  }
  const matched = checks.filter((c) => c.matched).length;
  return {
    matched,
    total: checks.length,
    percent: checks.length ? Math.round((matched / checks.length) * 100) : 0,
    checks,
  };
}
