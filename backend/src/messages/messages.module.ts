import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Block } from '../blocks/entities/block.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { DevicesModule } from '../devices/devices.module';
import { AuthModule } from '../auth/auth.module';
import { MessagesGateway } from './messages.gateway';
import { PremiumAccessGuard } from '../common/guards/premium-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Block, UserPhoto]),
    DevicesModule,
    AuthModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, PremiumAccessGuard],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
