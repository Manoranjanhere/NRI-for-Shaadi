import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('MessagesService', () => {
  const messageRepository = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 'm1', ...x })),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
  } as any;
  const userRepository = { findOne: jest.fn(), update: jest.fn() } as any;
  const blockRepository = { findOne: jest.fn().mockResolvedValue(null) } as any;
  const photoRepository = { findOne: jest.fn() } as any;
  const devicesService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) } as any;
  const messagesGateway = { emitNewMessage: jest.fn() } as any;

  let service: MessagesService;

  const mockUsers = (sender: Record<string, unknown>) => {
    userRepository.findOne
      .mockReset()
      .mockResolvedValueOnce({ id: 'to', isActive: true, isBanned: false })
      .mockResolvedValueOnce({ id: 'from', name: 'Sender', dailyMsgCount: 0, ...sender });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DISABLE_PAID_FEATURES;
    messageRepository.findOne.mockResolvedValue(null);
    mockUsers({ trialEndsAt: inDays(10) });
    service = new MessagesService(
      messageRepository,
      userRepository,
      blockRepository,
      photoRepository,
      devicesService,
      messagesGateway,
    );
  });

  it('throws on empty message content', async () => {
    await expect(service.sendMessage('from', 'to', { content: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('counts a new conversation during the free trial', async () => {
    const sent = await service.sendMessage('from', 'to', { content: 'Namaste' });

    expect(sent.id).toBe('m1');
    expect(userRepository.update).toHaveBeenCalledWith(
      'from',
      expect.objectContaining({ dailyMsgCount: 1 }),
    );
    expect(devicesService.sendPushToUser).toHaveBeenCalled();
    expect(messagesGateway.emitNewMessage).toHaveBeenCalled();
  });

  it('does not count replies in an existing conversation', async () => {
    messageRepository.findOne.mockResolvedValue({ id: 'existing' });

    await service.sendMessage('from', 'to', { content: 'Reply' });

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('blocks messaging once the trial has ended without a subscription', async () => {
    mockUsers({ trialEndsAt: inDays(-1), subscriptionTier: 0 });

    await expect(service.sendMessage('from', 'to', { content: 'Hi' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(messageRepository.save).not.toHaveBeenCalled();
  });
});
