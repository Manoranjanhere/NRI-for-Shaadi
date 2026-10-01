import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../likes/dto/likes.dto';
import { ShortlistService } from './shortlist.service';

@ApiTags('Shortlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shortlist')
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  @Get()
  @ApiOperation({ summary: 'Profiles you have shortlisted (free for all members)' })
  list(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.shortlistService.list(user.id, dto.page, dto.limit);
  }

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or remove a profile from your shortlist (toggle)' })
  toggle(@CurrentUser() user: User, @Param('userId') targetId: string) {
    return this.shortlistService.toggle(user.id, targetId);
  }
}
