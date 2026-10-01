import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { User, ProfileStage, UserGender } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { Like } from '../likes/entities/like.entity';
import { Pass } from '../passes/entities/pass.entity';
import { Block } from '../blocks/entities/block.entity';
import { Shortlist } from '../shortlist/entities/shortlist.entity';
import { PartnerPreferences } from '../users/profile-options';
import { toProfileSummary } from '../users/profile-summary';
import { scoreAgainstPreferences } from '../users/match-score';
import { UpdateLocationDto, DiscoverQueryDto } from './dto/discover.dto';

const AGE_SQL = `COALESCE(DATE_PART('year', AGE(u."dateOfBirth"))::int, u.age)`;

@Injectable()
export class DiscoverService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Pass)
    private readonly passRepository: Repository<Pass>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Shortlist)
    private readonly shortlistRepository: Repository<Shortlist>,
  ) {}

  private withCacheBuster(url: string, version: string): string {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${version}`;
  }

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<{ updated: boolean }> {
    await this.userRepository.update(userId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      locationUpdatedAt: new Date(),
    });
    return { updated: true };
  }

  async passUser(fromUserId: string, toUserId: string): Promise<{ passed: boolean }> {
    const existing = await this.passRepository.findOne({ where: { fromUserId, toUserId } });
    if (!existing) {
      await this.passRepository.save(this.passRepository.create({ fromUserId, toUserId }));
    }
    return { passed: true };
  }

  async undoPass(fromUserId: string, toUserId: string): Promise<{ restored: boolean }> {
    await this.passRepository.delete({ fromUserId, toUserId });
    return { restored: true };
  }

  private async excludedIds(userId: string): Promise<string[]> {
    const [likes, passes, blocks] = await Promise.all([
      this.likeRepository.find({ where: { fromUserId: userId }, select: ['toUserId'] }),
      this.passRepository.find({ where: { fromUserId: userId }, select: ['toUserId'] }),
      this.blockRepository.find({ where: [{ blockerId: userId }, { blockedId: userId }] }),
    ]);
    return [
      ...new Set([
        userId,
        ...likes.map((l) => l.toUserId),
        ...passes.map((p) => p.toUserId),
        ...blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)),
      ]),
    ];
  }

  private applyFilters(
    qb: SelectQueryBuilder<User>,
    dto: DiscoverQueryDto,
    gender: UserGender | undefined,
    excludeIds: string[],
  ) {
    qb.where('u."profileStage" >= :stage', { stage: ProfileStage.STAGE2_COMPLETE })
      .andWhere('u."isActive" = true')
      .andWhere('u."isBanned" = false')
      .andWhere('(u."hiddenUntil" IS NULL OR u."hiddenUntil" <= NOW())')
      .andWhere('u.id NOT IN (:...excludeIds)', { excludeIds });

    if (gender) qb.andWhere('u.gender = :gender', { gender });
    if (dto.minAge) qb.andWhere(`${AGE_SQL} >= :minAge`, { minAge: dto.minAge });
    if (dto.maxAge) qb.andWhere(`${AGE_SQL} <= :maxAge`, { maxAge: dto.maxAge });
    if (dto.minHeightCm) qb.andWhere('u."heightCm" >= :minHeightCm', { minHeightCm: dto.minHeightCm });
    if (dto.maxHeightCm) qb.andWhere('u."heightCm" <= :maxHeightCm', { maxHeightCm: dto.maxHeightCm });
    if (dto.religions?.length) qb.andWhere('u.religion IN (:...religions)', { religions: dto.religions });
    if (dto.maritalStatuses?.length) {
      qb.andWhere('u."maritalStatus" IN (:...maritalStatuses)', { maritalStatuses: dto.maritalStatuses });
    }
    if (dto.educationLevels?.length) {
      qb.andWhere('u."educationLevel" IN (:...educationLevels)', { educationLevels: dto.educationLevels });
    }
    if (dto.diets?.length) qb.andWhere('u.diet IN (:...diets)', { diets: dto.diets });
    if (dto.residencyStatuses?.length) {
      qb.andWhere('u."residencyStatus" IN (:...residencyStatuses)', { residencyStatuses: dto.residencyStatuses });
    }
    if (dto.motherTongues?.length) {
      qb.andWhere('LOWER(u."motherTongue") IN (:...motherTongues)', {
        motherTongues: dto.motherTongues.map((v) => v.toLowerCase()),
      });
    }
    if (dto.countries?.length) {
      qb.andWhere('LOWER(u.country) IN (:...countries)', {
        countries: dto.countries.map((v) => v.toLowerCase()),
      });
    }
    if (dto.community) {
      qb.andWhere('(u.community ILIKE :community OR u."subCommunity" ILIKE :community)', {
        community: `%${dto.community}%`,
      });
    }
    if (dto.keyword) {
      qb.andWhere(
        '(u.name ILIKE :kw OR u.occupation ILIKE :kw OR u.city ILIKE :kw OR u.community ILIKE :kw OR u."educationField" ILIKE :kw)',
        { kw: `%${dto.keyword}%` },
      );
    }
    if (dto.verifiedOnly) qb.andWhere(`u."photoVerifiedStatus" = 'verified'`);
    if (dto.withPhotoOnly) {
      qb.andWhere('EXISTS (SELECT 1 FROM user_photos p WHERE p."userId" = u.id)');
    }
  }

  /** SQL expression counting how many of the viewer's partner preferences a candidate meets. */
  private preferenceScoreSql(prefs: PartnerPreferences | null | undefined): {
    sql: string;
    params: Record<string, unknown>;
  } {
    const parts: string[] = [];
    const params: Record<string, unknown> = {};
    const lower = (list?: string[]) => (list || []).map((v) => v.toLowerCase());
    if (prefs) {
      if (prefs.minAge || prefs.maxAge) {
        parts.push(`CASE WHEN ${AGE_SQL} BETWEEN :pMinAge AND :pMaxAge THEN 2 ELSE 0 END`);
        params.pMinAge = prefs.minAge ?? 18;
        params.pMaxAge = prefs.maxAge ?? 99;
      }
      if (prefs.minHeightCm || prefs.maxHeightCm) {
        parts.push(`CASE WHEN u."heightCm" BETWEEN :pMinH AND :pMaxH THEN 1 ELSE 0 END`);
        params.pMinH = prefs.minHeightCm ?? 0;
        params.pMaxH = prefs.maxHeightCm ?? 999;
      }
      if (prefs.religions?.length) {
        parts.push(`CASE WHEN u.religion IN (:...pReligions) THEN 2 ELSE 0 END`);
        params.pReligions = prefs.religions;
      }
      if (prefs.maritalStatuses?.length) {
        parts.push(`CASE WHEN u."maritalStatus" IN (:...pMarital) THEN 2 ELSE 0 END`);
        params.pMarital = prefs.maritalStatuses;
      }
      if (prefs.communities?.length) {
        parts.push(`CASE WHEN LOWER(u.community) IN (:...pCommunities) OR u."casteNoBar" = true THEN 1 ELSE 0 END`);
        params.pCommunities = lower(prefs.communities);
      }
      if (prefs.motherTongues?.length) {
        parts.push(`CASE WHEN LOWER(u."motherTongue") IN (:...pTongues) THEN 1 ELSE 0 END`);
        params.pTongues = lower(prefs.motherTongues);
      }
      if (prefs.countries?.length) {
        parts.push(`CASE WHEN LOWER(u.country) IN (:...pCountries) THEN 2 ELSE 0 END`);
        params.pCountries = lower(prefs.countries);
      }
      if (prefs.educationLevels?.length) {
        parts.push(`CASE WHEN u."educationLevel" IN (:...pEdu) THEN 1 ELSE 0 END`);
        params.pEdu = prefs.educationLevels;
      }
      if (prefs.diets?.length) {
        parts.push(`CASE WHEN u.diet IN (:...pDiets) THEN 1 ELSE 0 END`);
        params.pDiets = prefs.diets;
      }
    }
    parts.push(`CASE WHEN u."photoVerifiedStatus" = 'verified' THEN 1 ELSE 0 END`);
    return { sql: parts.join(' + '), params };
  }

  private defaultGender(viewer: User): UserGender | undefined {
    if (viewer.gender === UserGender.MALE) return UserGender.FEMALE;
    if (viewer.gender === UserGender.FEMALE) return UserGender.MALE;
    return undefined;
  }

  async getMatches(userId: string, dto: DiscoverQueryDto) {
    const viewer = await this.userRepository.findOne({ where: { id: userId } });
    if (!viewer) throw new NotFoundException('User not found');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const sort = dto.sort ?? 'recommended';
    const gender = dto.gender ?? this.defaultGender(viewer);
    const excludeIds = await this.excludedIds(userId);

    const base = this.userRepository.createQueryBuilder('u');
    this.applyFilters(base, dto, gender, excludeIds);

    const total = await base.clone().getCount();

    const ranked = base.clone().select('u.id', 'id');
    if (sort === 'recommended') {
      const score = this.preferenceScoreSql(viewer.partnerPreferences);
      ranked
        .addSelect(`(${score.sql})`, 'score')
        .setParameters(score.params)
        .orderBy('score', 'DESC')
        .addOrderBy('u."lastActiveAt"', 'DESC', 'NULLS LAST');
    } else if (sort === 'newest') {
      ranked.orderBy('u."createdAt"', 'DESC');
    } else {
      ranked.orderBy('u."lastActiveAt"', 'DESC', 'NULLS LAST');
    }
    ranked.addOrderBy('u.id', 'ASC').offset((page - 1) * limit).limit(limit);

    const ids: string[] = (await ranked.getRawMany()).map((r: { id: string }) => r.id);
    if (!ids.length) {
      return { users: [], total, page, limit, pages: Math.ceil(total / limit) };
    }

    const [users, photos, shortlisted] = await Promise.all([
      this.userRepository.find({ where: { id: In(ids) } }),
      this.photoRepository.find({ where: { userId: In(ids) }, order: { order: 'ASC' } }),
      this.shortlistRepository.find({ where: { userId, shortlistedId: In(ids) } }),
    ]);
    const byId = new Map(users.map((u) => [u.id, u]));
    const shortlistedIds = new Set(shortlisted.map((s) => s.shortlistedId));

    const enriched = ids
      .map((id) => byId.get(id))
      .filter((u): u is User => !!u)
      .map((u) => {
        const userPhotos = photos
          .filter((p) => p.userId === u.id)
          .map((p) => ({ ...p, url: this.withCacheBuster(p.url, p.id) }));
        const theirFit = scoreAgainstPreferences(viewer.partnerPreferences, u);
        const yourFit = scoreAgainstPreferences(u.partnerPreferences, viewer);
        return {
          ...toProfileSummary(u, userPhotos[0]?.url ?? null),
          photos: userPhotos,
          subCommunity: u.subCommunity ?? null,
          educationField: u.educationField ?? null,
          grewUpIn: u.grewUpIn ?? null,
          diet: u.diet ?? null,
          matchPercent: theirFit.total ? theirFit.percent : null,
          matchedPreferences: theirFit.matched,
          totalPreferences: theirFit.total,
          youMatchTheirPreferences: yourFit.total ? yourFit.percent : null,
          isShortlisted: shortlistedIds.has(u.id),
        };
      });

    return { users: enriched, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
