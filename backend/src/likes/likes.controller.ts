import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto, SendInterestDto } from './dto/likes.dto';

@ApiTags('Interests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get('you-liked')
  @ApiOperation({ summary: 'Interests you have sent, with pending / accepted / declined status' })
  getYouLiked(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.likesService.getYouLiked(user.id, dto);
  }

  @Get('liked-by/unseen-count')
  @ApiOperation({ summary: 'New pending interests since you last opened Interests Received' })
  getUnseenLikedByCount(@CurrentUser() user: User) {
    return this.likesService.getUnseenLikedByCount(user.id).then((count) => ({ count }));
  }

  @Post('liked-by/mark-seen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark Interests Received as seen (clears badge)' })
  markLikedBySeen(@CurrentUser() user: User) {
    return this.likesService.markLikedBySeen(user.id);
  }

  @Get('liked-by')
  @ApiOperation({ summary: 'Pending interests you have received' })
  getLikedBy(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.likesService.getLikedBy(user.id, dto);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Accepted connections (mutual interest)' })
  getMatches(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.likesService.getMatches(user.id, dto);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Full matrimony profile, interest status, match score and contact (if connected)' })
  getFullProfile(@CurrentUser() user: User, @Param('userId') targetUserId: string) {
    return this.likesService.getFullProfile(user.id, targetUserId);
  }

  @Post(':userId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an interest received from this member (free)' })
  decline(@CurrentUser() user: User, @Param('userId') fromUserId: string) {
    return this.likesService.declineInterest(user.id, fromUserId);
  }

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send / accept an interest (premium or free trial). Calling again withdraws it.' })
  likeUser(
    @CurrentUser() user: User,
    @Param('userId') toUserId: string,
    @Body() dto: SendInterestDto,
  ) {
    return this.likesService.likeUser(user.id, toUserId, dto?.message);
  }
}
