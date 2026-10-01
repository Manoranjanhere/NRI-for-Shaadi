import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shortlist } from './entities/shortlist.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { toProfileSummary } from '../users/profile-summary';

@Injectable()
export class ShortlistService {
  constructor(
    @InjectRepository(Shortlist)
    private readonly shortlistRepository: Repository<Shortlist>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
  ) {}

  async toggle(userId: string, targetId: string): Promise<{ shortlisted: boolean }> {
    if (userId === targetId) throw new BadRequestException('Cannot shortlist yourself');
    const target = await this.userRepository.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Member not found');

    const existing = await this.shortlistRepository.findOne({
      where: { userId, shortlistedId: targetId },
    });
    if (existing) {
      await this.shortlistRepository.remove(existing);
      return { shortlisted: false };
    }
    await this.shortlistRepository.save(
      this.shortlistRepository.create({ userId, shortlistedId: targetId }),
    );
    return { shortlisted: true };
  }

  async isShortlisted(userId: string, targetId: string): Promise<boolean> {
    const count = await this.shortlistRepository.count({
      where: { userId, shortlistedId: targetId },
    });
    return count > 0;
  }

  async list(userId: string, page = 1, limit = 20) {
    const [rows, total] = await this.shortlistRepository.findAndCount({
      where: { userId },
      relations: ['shortlisted'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const users = await Promise.all(
      rows
        .filter((r) => r.shortlisted && r.shortlisted.isActive && !r.shortlisted.isBanned)
        .map(async (r) => {
          const photo = await this.photoRepository.findOne({
            where: { userId: r.shortlistedId },
            order: { order: 'ASC' },
          });
          return {
            ...toProfileSummary(r.shortlisted, photo ? `${photo.url}${photo.url.includes('?') ? '&' : '?'}v=${photo.id}` : null),
            shortlistedAt: r.createdAt,
          };
        }),
    );

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
