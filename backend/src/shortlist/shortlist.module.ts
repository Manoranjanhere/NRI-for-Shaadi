import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shortlist } from './entities/shortlist.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { ShortlistService } from './shortlist.service';
import { ShortlistController } from './shortlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shortlist, User, UserPhoto])],
  controllers: [ShortlistController],
  providers: [ShortlistService],
  exports: [ShortlistService],
})
export class ShortlistModule {}
