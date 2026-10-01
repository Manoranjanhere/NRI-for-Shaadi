import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscoverService } from './discover.service';
import { UpdateLocationDto, DiscoverQueryDto } from './dto/discover.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Discover')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Patch('location')
  @ApiOperation({ summary: 'Update current user location (optional)' })
  updateLocation(@CurrentUser() user: User, @Body() dto: UpdateLocationDto) {
    return this.discoverService.updateLocation(user.id, dto);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Search / recommended matches ranked by partner preferences' })
  getMatches(@CurrentUser() user: User, @Query() dto: DiscoverQueryDto) {
    return this.discoverService.getMatches(user.id, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Deprecated alias of /discover/matches' })
  getNearby(@CurrentUser() user: User, @Query() dto: DiscoverQueryDto) {
    return this.discoverService.getMatches(user.id, dto);
  }

  @Post('pass/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Not interested — hide this profile from matches' })
  passUser(@CurrentUser() user: User, @Param('userId') toUserId: string) {
    return this.discoverService.passUser(user.id, toUserId);
  }

  @Delete('pass/:userId')
  @ApiOperation({ summary: 'Undo "not interested"' })
  undoPass(@CurrentUser() user: User, @Param('userId') toUserId: string) {
    return this.discoverService.undoPass(user.id, toUserId);
  }
}
