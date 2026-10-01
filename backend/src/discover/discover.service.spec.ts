import { NotFoundException } from '@nestjs/common';
import { DiscoverService } from './discover.service';

describe('DiscoverService', () => {
  it('throws when the current user does not exist', async () => {
    const userRepository = { findOne: jest.fn().mockResolvedValue(null) } as any;
    const service = new DiscoverService(
      userRepository,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.getMatches('u1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
