import { cmToFeetInches, labelFor, RELIGIONS } from '../constants/profileOptions';

interface SummaryFields {
  age?: number | null;
  heightCm?: number | null;
  religion?: string | null;
  community?: string | null;
  motherTongue?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

const join = (parts: (string | null | undefined | false)[], sep = ' · ') => parts.filter(Boolean).join(sep);

/** "29 yrs, 5'6" · Hindu, Brahmin" */
export function basicsLine(p: SummaryFields): string {
  const agePart = p.age ? `${p.age} yrs` : '';
  const height = cmToFeetInches(p.heightCm);
  const faith = join([p.religion ? labelFor(p.religion, RELIGIONS) : '', p.community], ', ');
  return join([join([agePart, height], ', '), faith]);
}

/** "Software Engineer · San Jose, United States" */
export function careerLocationLine(p: SummaryFields): string {
  return join([p.occupation || (p.educationLevel ? labelFor(p.educationLevel) : ''), locationText(p)]);
}

export function locationText(p: Pick<SummaryFields, 'city' | 'state' | 'country'>): string {
  return join([p.city, p.country], ', ');
}

export function timeAgo(date?: string | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function activityText(lastActiveAt?: string | null): string {
  if (!lastActiveAt) return '';
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  if (diff < 15 * 60000) return 'Online now';
  if (diff < 24 * 3600000) return 'Active today';
  if (diff < 7 * 24 * 3600000) return 'Active this week';
  return '';
}
