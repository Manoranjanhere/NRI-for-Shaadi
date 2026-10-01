import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Block } from '../blocks/entities/block.entity';
import { SendMessageDto, MessagePaginationDto } from './dto/messages.dto';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { DevicesService } from '../devices/devices.service';
import { PREMIUM_DAILY_QUOTAS, isPaidFeaturesDisabled } from '../subscriptions/subscription.constants';
import { assertPremiumAccess } from '../common/guards/premium-access.guard';
import { MessagesGateway } from './messages.gateway';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    private readonly devicesService: DevicesService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  private withCacheBuster(url: string, version: string): string {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${version}`;
  }

  private async ensureMessagingAllowed(userId: string, recipientId: string): Promise<void> {
    if (userId === recipientId) {
      throw new BadRequestException('Cannot message yourself');
    }

    const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
    if (!recipient || !recipient.isActive || recipient.isBanned) {
      throw new NotFoundException('Recipient not found');
    }

    const blocked = await this.blockRepository.findOne({
      where: [
        { blockerId: userId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: userId },
      ],
    });
    if (blocked) {
      throw new ForbiddenException('You cannot message this member');
    }
  }

  /** True if any message already exists between these two users (either direction). */
  private async hasExistingConversation(userId: string, recipientId: string): Promise<boolean> {
    const existing = await this.messageRepository.findOne({
      where: [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId },
      ],
    });
    return !!existing;
  }

  async sendMessage(senderId: string, recipientId: string, dto: SendMessageDto) {
    await this.ensureMessagingAllowed(senderId, recipientId);

    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Message cannot be empty');
    }

    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }
    assertPremiumAccess(sender);

    const isNewConversation = !(await this.hasExistingConversation(senderId, recipientId));
    if (!isPaidFeaturesDisabled() && isNewConversation) {
      const today = new Date().toISOString().split('T')[0];
      const lastReset = sender.dailyMsgResetAt
        ? new Date(sender.dailyMsgResetAt).toISOString().split('T')[0]
        : null;
      const used = lastReset === today ? sender.dailyMsgCount || 0 : 0;
      if (used >= PREMIUM_DAILY_QUOTAS.newConversations) {
        throw new ForbiddenException(
          `You can start ${PREMIUM_DAILY_QUOTAS.newConversations} new conversations a day. Keep chatting with existing connections or try again tomorrow.`,
        );
      }
      await this.userRepository.update(senderId, {
        dailyMsgCount: used + 1,
        dailyMsgResetAt: new Date(),
      });
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        senderId,
        recipientId,
        content,
      }),
    );

    await this.devicesService.sendPushToUser(recipientId, {
      title: `💬 ${sender?.name || 'New message'}`,
      body: content.length > 120 ? `${content.slice(0, 117)}...` : content,
      data: { type: 'message', userId: senderId },
    });

    this.messagesGateway.emitNewMessage(message);

    return message;
  }

  async getConversation(userId: string, recipientId: string, dto: MessagePaginationDto) {
    await this.ensureMessagingAllowed(userId, recipientId);

    const { page = 1, limit = 30 } = dto;
    const skip = (page - 1) * limit;

    const baseQb = this.messageRepository
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :userId AND m.recipientId = :recipientId) OR (m.senderId = :recipientId AND m.recipientId = :userId)',
        { userId, recipientId },
      );

    const [messages, total] = await Promise.all([
      baseQb
        .clone()
        .orderBy('m.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany(),
      baseQb.clone().getCount(),
      this.messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({ readAt: () => 'NOW()' })
        .where('senderId = :recipientId', { recipientId })
        .andWhere('recipientId = :userId', { userId })
        .andWhere('readAt IS NULL')
        .execute(),
    ]);

    return {
      messages: [...messages].reverse(),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getInbox(userId: string) {
    const recent = await this.messageRepository.find({
      where: [{ senderId: userId }, { recipientId: userId }],
      relations: ['sender', 'recipient'],
      order: { createdAt: 'DESC' },
      take: 500,
    });

    const convoMap = new Map<string, {
      userId: string;
      userName: string;
      lastMessage: string;
      lastMessageAt: Date;
      unreadCount: number;
      primaryPhoto: string | null;
    }>();

    for (const msg of recent) {
      const isIncoming = msg.recipientId === userId;
      const other = isIncoming ? msg.sender : msg.recipient;
      if (!other) continue;

      const existing = convoMap.get(other.id);
      if (!existing) {
        convoMap.set(other.id, {
          userId: other.id,
          userName: other.name || 'Member',
          lastMessage:
            msg.kind === 'compliment' ? `💝 ${msg.content}` : msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: isIncoming && !msg.readAt ? 1 : 0,
          primaryPhoto: null,
        });
      } else if (isIncoming && !msg.readAt) {
        existing.unreadCount += 1;
      }
    }

    const conversations = await Promise.all(
      Array.from(convoMap.values()).map(async (c) => {
        const photo = await this.photoRepository.findOne({
          where: { userId: c.userId },
          order: { order: 'ASC' },
        });
        return {
          ...c,
          primaryPhoto: photo ? this.withCacheBuster(photo.url, photo.id) : null,
        };
      }),
    );

    conversations.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));

    return { conversations };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        recipientId: userId,
        readAt: IsNull(),
      },
    });
  }
}
