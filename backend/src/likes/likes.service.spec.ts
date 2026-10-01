import { ForbiddenException } from '@nestjs/common';
import { LikesService } from './likes.service';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('LikesService (interests)', () => {
  const build = (sender: Record<string, unknown>, mutual: boolean) => {
    const likeRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null) // existing interest
        .mockResolvedValueOnce(mutual ? { id: 'mutual' } : null), // reverse interest
      create: jest.fn((x) => x),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;
    const userRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 'from', name: 'Sender', ...sender })
        .mockResolvedValueOnce({ id: 'to', name: 'Target', isActive: true, isBanned: false }),
      update: jest.fn(),
    } as any;
    const passRepository = { delete: jest.fn() } as any;
    const blockRepository = { count: jest.fn().mockResolvedValue(0) } as any;
    const devicesService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new LikesService(
      likeRepository,
      userRepository,
      { find: jest.fn(), findOne: jest.fn() } as any,
      passRepository,
      blockRepository,
      {} as any,
      devicesService,
      {} as any,
    );
    return { service, likeRepository, devicesService };
  };

  beforeEach(() => {
    delete process.env.DISABLE_PAID_FEATURES;
  });

  it('connects both members when the interest is mutual', async () => {
    const { service, devicesService } = build({ trialEndsAt: inDays(5) }, true);

    const result = await service.likeUser('from', 'to');

    expect(result).toEqual({ liked: true, isMatch: true });
    expect(devicesService.sendPushToUser).toHaveBeenCalledTimes(2);
  });

  it('requires trial or Premium to send an interest', async () => {
    const { service, likeRepository } = build({ trialEndsAt: inDays(-2), subscriptionTier: 0 }, false);

    await expect(service.likeUser('from', 'to')).rejects.toBeInstanceOf(ForbiddenException);
    expect(likeRepository.save).not.toHaveBeenCalled();
  });
});
