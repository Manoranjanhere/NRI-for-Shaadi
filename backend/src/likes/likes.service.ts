import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { Pass } from '../passes/entities/pass.entity';
import { Block } from '../blocks/entities/block.entity';
import { Shortlist } from '../shortlist/entities/shortlist.entity';
import { PaginationDto } from './dto/likes.dto';
import { DevicesService } from '../devices/devices.service';
import { UsersService } from '../users/users.service';
import {
  PREMIUM_DAILY_QUOTAS,
  hasPremiumAccess,
  isPaidFeaturesDisabled,
} from '../subscriptions/subscription.constants';
import { assertPremiumAccess } from '../common/guards/premium-access.guard';
import { toProfileSummary, toPublicProfile } from '../users/profile-summary';
import { scoreAgainstPreferences } from '../users/match-score';

export type InterestStatus = 'pending' | 'accepted' | 'declined';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(Pass)
    private readonly passRepository: Repository<Pass>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Shortlist)
    private readonly shortlistRepository: Repository<Shortlist>,
    private readonly devicesService: DevicesService,
    private readonly usersService: UsersService,
  ) {}

  private withCacheBuster(url: string, version: string): string {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${version}`;
  }

  private async primaryPhoto(userId: string): Promise<string | null> {
    const photo = await this.photoRepository.findOne({
      where: { userId },
      order: { order: 'ASC' },
    });
    return photo ? this.withCacheBuster(photo.url, photo.id) : null;
  }

  private async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const count = await this.blockRepository.count({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
    return count > 0;
  }

  private async ensureTarget(fromUserId: string, toUserId: string): Promise<User> {
    if (fromUserId === toUserId) {
      throw new ConflictException('You cannot send an interest to yourself');
    }
    const target = await this.userRepository.findOne({ where: { id: toUserId } });
    if (!target || !target.isActive || target.isBanned) throw new NotFoundException('Member not found');
    if (await this.isBlockedEitherWay(fromUserId, toUserId)) {
      throw new ForbiddenException('You cannot interact with this member');
    }
    return target;
  }

  private async consumeInterestQuota(sender: User): Promise<void> {
    if (isPaidFeaturesDisabled()) return;
    const today = new Date().toISOString().split('T')[0];
    const lastReset = sender.dailyInterestResetAt
      ? new Date(sender.dailyInterestResetAt).toISOString().split('T')[0]
      : null;
    const used = lastReset === today ? sender.dailyInterestCount || 0 : 0;
    if (used >= PREMIUM_DAILY_QUOTAS.interests) {
      throw new ForbiddenException(
        `You have sent ${PREMIUM_DAILY_QUOTAS.interests} interests today. Please try again tomorrow.`,
      );
    }
    await this.userRepository.update(sender.id, {
      dailyInterestCount: used + 1,
      dailyInterestResetAt: new Date(),
    });
  }

  /** Send an interest (or accept one — a mutual interest is a connection). Sending again withdraws it. */
  async likeUser(
    fromUserId: string,
    toUserId: string,
    message?: string,
  ): Promise<{ liked: boolean; isMatch: boolean }> {
    const sender = await this.userRepository.findOne({ where: { id: fromUserId } });
    if (!sender) throw new NotFoundException('User not found');
    const target = await this.ensureTarget(fromUserId, toUserId);

    const existing = await this.likeRepository.findOne({ where: { fromUserId, toUserId } });
    if (existing) {
      await this.likeRepository.remove(existing);
      return { liked: false, isMatch: false };
    }

    assertPremiumAccess(sender);
    await this.consumeInterestQuota(sender);

    // Accepting clears any earlier decline of this member.
    await this.passRepository.delete({ fromUserId, toUserId });

    await this.likeRepository.save(
      this.likeRepository.create({
        fromUserId,
        toUserId,
        isSuperLike: false,
        complimentMessage: message?.trim() || null,
      }),
    );

    const mutual = await this.likeRepository.findOne({
      where: { fromUserId: toUserId, toUserId: fromUserId },
    });
    const senderName = sender.name || 'A member';

    if (mutual) {
      await Promise.all([
        this.devicesService.sendPushToUser(toUserId, {
          title: '🎉 Interest Accepted!',
          body: `${senderName} accepted your interest. Start a conversation now.`,
          data: { type: 'match', userId: fromUserId },
        }),
        this.devicesService.sendPushToUser(fromUserId, {
          title: '🎉 You are now connected!',
          body: `You and ${target.name || 'your match'} are connected on NRI Shaadi.`,
          data: { type: 'match', userId: toUserId },
        }),
      ]);
    } else {
      await this.devicesService.sendPushToUser(toUserId, {
        title: '💌 New Interest',
        body: message?.trim()
          ? `${senderName}: ${message.trim().slice(0, 100)}`
          : `${senderName} is interested in your profile`,
        data: { type: 'like', userId: fromUserId },
      });
    }

    return { liked: true, isMatch: !!mutual };
  }

  /** Decline a received interest — hides them from your received list and search results. */
  async declineInterest(userId: string, fromUserId: string): Promise<{ declined: boolean }> {
    const existing = await this.passRepository.findOne({
      where: { fromUserId: userId, toUserId: fromUserId },
    });
    if (!existing) {
      await this.passRepository.save(
        this.passRepository.create({ fromUserId: userId, toUserId: fromUserId }),
      );
    }
    // Declining a connection also withdraws your own interest.
    await this.likeRepository.delete({ fromUserId: userId, toUserId: fromUserId });
    return { declined: true };
  }

  private async summaries(userIds: string[]) {
    if (!userIds.length) return new Map<string, ReturnType<typeof toProfileSummary>>();
    const users = await this.userRepository.find({ where: { id: In(userIds) } });
    const entries = await Promise.all(
      users
        .filter((u) => u.isActive && !u.isBanned)
        .map(async (u) => [u.id, toProfileSummary(u, await this.primaryPhoto(u.id))] as const),
    );
    return new Map(entries);
  }

  async getYouLiked(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const [likes, total] = await this.likeRepository.findAndCount({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const targetIds = likes.map((l) => l.toUserId);
    const [cards, mutuals, declines] = await Promise.all([
      this.summaries(targetIds),
      targetIds.length
        ? this.likeRepository.find({ where: { fromUserId: In(targetIds), toUserId: userId } })
        : Promise.resolve([] as Like[]),
      targetIds.length
        ? this.passRepository.find({ where: { fromUserId: In(targetIds), toUserId: userId } })
        : Promise.resolve([] as Pass[]),
    ]);
    const accepted = new Set(mutuals.map((m) => m.fromUserId));
    const declined = new Set(declines.map((d) => d.fromUserId));

    const users = likes
      .filter((l) => cards.has(l.toUserId))
      .map((l) => {
        const status: InterestStatus = accepted.has(l.toUserId)
          ? 'accepted'
          : declined.has(l.toUserId)
            ? 'declined'
            : 'pending';
        return {
          ...cards.get(l.toUserId)!,
          likedAt: l.createdAt,
          interestMessage: l.complimentMessage || null,
          interestStatus: status,
        };
      });

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Pending interests you have received (not yet accepted or declined). */
  async getLikedBy(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const params: unknown[] = [userId, limit, (page - 1) * limit];
    const pendingFilter = `
      l."toUserId" = $1
      AND NOT EXISTS (SELECT 1 FROM likes back WHERE back."fromUserId" = $1 AND back."toUserId" = l."fromUserId")
      AND NOT EXISTS (SELECT 1 FROM passes p WHERE p."fromUserId" = $1 AND p."toUserId" = l."fromUserId")
      AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b."blockerId" = $1 AND b."blockedId" = l."fromUserId")
           OR (b."blockerId" = l."fromUserId" AND b."blockedId" = $1)
      )
    `;
    const rows: { fromUserId: string; createdAt: Date; complimentMessage: string | null }[] =
      await this.likeRepository.query(
        `SELECT l."fromUserId", l."createdAt", l."complimentMessage"
         FROM likes l WHERE ${pendingFilter}
         ORDER BY l."createdAt" DESC LIMIT $2 OFFSET $3`,
        params,
      );
    const countRows = await this.likeRepository.query(
      `SELECT COUNT(*)::int AS total FROM likes l WHERE ${pendingFilter}`,
      [userId],
    );
    const cards = await this.summaries(rows.map((r) => r.fromUserId));
    const users = rows
      .filter((r) => cards.has(r.fromUserId))
      .map((r) => ({
        ...cards.get(r.fromUserId)!,
        likedAt: r.createdAt,
        interestMessage: r.complimentMessage || null,
        interestStatus: 'pending' as InterestStatus,
      }));
    const total = countRows[0]?.total ?? 0;
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUnseenLikedByCount(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'likedBySeenAt'],
    });
    if (!user) return 0;

    const qb = this.likeRepository
      .createQueryBuilder('like')
      .where('like.toUserId = :userId', { userId })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM likes back WHERE back."fromUserId" = :userId AND back."toUserId" = like."fromUserId")',
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM passes p WHERE p."fromUserId" = :userId AND p."toUserId" = like."fromUserId")',
      );

    if (user.likedBySeenAt) {
      qb.andWhere('like.createdAt > :seenAt', { seenAt: user.likedBySeenAt });
    }

    return qb.getCount();
  }

  async markLikedBySeen(userId: string): Promise<void> {
    await this.userRepository.update(userId, { likedBySeenAt: new Date() });
  }

  /** Accepted connections (mutual interest). */
  async getMatches(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;

    const rows: { userId: string; matchedAt: Date }[] = await this.likeRepository.query(
      `
      SELECT l1."toUserId" AS "userId", GREATEST(l1."createdAt", l2."createdAt") AS "matchedAt"
      FROM likes l1
      INNER JOIN likes l2 ON l1."fromUserId" = l2."toUserId" AND l1."toUserId" = l2."fromUserId"
      WHERE l1."fromUserId" = $1
      ORDER BY "matchedAt" DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, (page - 1) * limit],
    );

    const countResult = await this.likeRepository.query(
      `
      SELECT COUNT(*)::int AS total
      FROM likes l1
      INNER JOIN likes l2 ON l1."fromUserId" = l2."toUserId" AND l1."toUserId" = l2."fromUserId"
      WHERE l1."fromUserId" = $1
      `,
      [userId],
    );

    const cards = await this.summaries(rows.map((r) => r.userId));
    const users = rows
      .filter((r) => cards.has(r.userId))
      .map((r) => ({ ...cards.get(r.userId)!, matchedAt: r.matchedAt, interestStatus: 'accepted' as InterestStatus }));

    const total = countResult[0]?.total ?? 0;
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getFullProfile(viewerId: string, targetUserId: string) {
    const [user, viewer] = await Promise.all([
      this.userRepository.findOne({ where: { id: targetUserId } }),
      this.userRepository.findOne({ where: { id: viewerId } }),
    ]);
    if (!user || !viewer) throw new NotFoundException('Member not found');
    const isSelf = viewerId === targetUserId;
    if (!isSelf && (!user.isActive || user.isBanned || (await this.isBlockedEitherWay(viewerId, targetUserId)))) {
      throw new NotFoundException('Member not found');
    }

    const photos = await this.photoRepository.find({
      where: { userId: targetUserId },
      order: { order: 'ASC' },
    });
    const photosWithCache = photos.map((photo) => ({
      ...photo,
      url: this.withCacheBuster(photo.url, photo.id),
    }));

    const [sent, received, declinedByMe, declinedByThem, shortlisted] = await Promise.all([
      this.likeRepository.findOne({ where: { fromUserId: viewerId, toUserId: targetUserId } }),
      this.likeRepository.findOne({ where: { fromUserId: targetUserId, toUserId: viewerId } }),
      this.passRepository.count({ where: { fromUserId: viewerId, toUserId: targetUserId } }),
      this.passRepository.count({ where: { fromUserId: targetUserId, toUserId: viewerId } }),
      this.shortlistRepository.count({ where: { userId: viewerId, shortlistedId: targetUserId } }),
    ]);
    const isConnected = !!sent && !!received;

    const canSeeContact =
      isConnected &&
      user.showContactToConnections &&
      (isPaidFeaturesDisabled() || hasPremiumAccess(viewer));

    if (!isSelf) {
      this.usersService.recordProfileView(viewerId, targetUserId).catch(() => undefined);
    }

    return {
      ...toPublicProfile(user),
      photos: photosWithCache,
      primaryPhoto: photosWithCache[0]?.url || null,
      hasLiked: !!sent,
      interestSent: !!sent,
      interestSentStatus: sent
        ? (isConnected ? 'accepted' : declinedByThem ? 'declined' : 'pending')
        : null,
      interestReceived: !!received,
      interestReceivedMessage: received?.complimentMessage || null,
      declinedByMe: declinedByMe > 0,
      isConnected,
      isShortlisted: shortlisted > 0,
      contact: canSeeContact ? { phone: user.phone || null, email: user.email || null } : null,
      contactLocked: isConnected && !canSeeContact && user.showContactToConnections,
      theyMatchYourPreferences: isSelf ? null : scoreAgainstPreferences(viewer.partnerPreferences, user),
      youMatchTheirPreferences: isSelf ? null : scoreAgainstPreferences(user.partnerPreferences, viewer),
    };
  }
}
