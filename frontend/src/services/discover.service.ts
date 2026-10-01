import { api } from './api';
import type { ProfileSummary, UserPhoto, Paginated } from './profile.service';

export type MatchSort = 'recommended' | 'newest' | 'active';

export interface MatchFilters {
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  religions?: string[];
  motherTongues?: string[];
  countries?: string[];
  maritalStatuses?: string[];
  educationLevels?: string[];
  diets?: string[];
  residencyStatuses?: string[];
  community?: string;
  keyword?: string;
  verifiedOnly?: boolean;
  withPhotoOnly?: boolean;
}

export interface MatchCardUser extends ProfileSummary {
  photos: UserPhoto[];
  subCommunity: string | null;
  educationField: string | null;
  grewUpIn: string | null;
  diet: string | null;
  matchPercent: number | null;
  matchedPreferences: number;
  totalPreferences: number;
  youMatchTheirPreferences: number | null;
  isShortlisted: boolean;
}

export function countActiveFilters(filters: MatchFilters): number {
  return Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '' && v !== false,
  ).length;
}

function toParams(filters: MatchFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) params[key] = value.join(',');
    } else if (value !== undefined && value !== '' && value !== false) {
      params[key] = value as string | number | boolean;
    }
  });
  return params;
}

const DiscoverService = {
  async getMatches(
    filters: MatchFilters = {},
    sort: MatchSort = 'recommended',
    page = 1,
    limit = 10,
  ): Promise<Paginated<MatchCardUser>> {
    const { data } = await api.get('/discover/matches', {
      params: { ...toParams(filters), sort, page, limit },
    });
    return data;
  },

  /** "Not interested" — hides the profile from your matches. */
  async passUser(userId: string): Promise<void> {
    await api.post(`/discover/pass/${userId}`);
  },

  async undoPass(userId: string): Promise<void> {
    await api.delete(`/discover/pass/${userId}`);
  },
};

export default DiscoverService;
