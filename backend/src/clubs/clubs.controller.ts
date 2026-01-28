import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) { }

  @Get()
  getAllClubs() {
    return this.clubsService.getAllClubs();
  }

  @Get(':id')
  @UseGuards(OptionalAuth)
  async getClubById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const club = await this.clubsService.getClubWithStats(id, req.user?.id);
    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return club;
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  createClub(
    @Body() createClubDto: CreateClubDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.clubsService.createClub(
      createClubDto,
      user.id
    );
  }

  @Put(':id')
  @UseGuards(JwtAccessGuard)
  async updateClub(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateClubDto>,
    @CurrentUser() user: { id: number; role: string },
  ) {
    const club = await this.clubsService.updateClub(
      id,
      updateData,
      user.id,
      user.role,
    );
    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return club;
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  async deleteClub(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    const deleted = await this.clubsService.deleteClub(
      id,
      user.id,
      user.role,
    );
    if (!deleted) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return { deleted: true };
  }

  @Get(':id/events')
  async getClubEvents(@Param('id', ParseIntPipe) id: number): Promise<{
    events: any[];
    statistics: {
      totalEvents: number;
      totalAttendance: number;
      averageAttendanceRate: number;
    };
  }> {
    const events = await this.clubsService.getClubEventsWithStats(id);
    if (!events) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return events as {
      events: any[];
      statistics: {
        totalEvents: number;
        totalAttendance: number;
        averageAttendanceRate: number;
      };
    };
  }

  // Get club follower count
  @Get(':id/followers/count')
  async getFollowerCount(@Param('id', ParseIntPipe) id: number) {
    const count = await this.clubsService.getFollowerCount(id);
    return { count };
  }

  // Get club followers list
  @Get(':id/followers')
  async getFollowers(@Param('id', ParseIntPipe) id: number) {
    return this.clubsService.getFollowers(id);
  }

  // Check if current user follows the club
  @Get(':id/following')
  @UseGuards(JwtAccessGuard)
  async isFollowing(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const isFollowing = await this.clubsService.isFollowing(req.user!.id, id);
    return { isFollowing };
  }

  // Follow a club
  @Post(':id/follow')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  followClub(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.clubsService.followClub(req.user!.id, id);
  }

  // Unfollow a club
  @Delete(':id/follow')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowClub(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.clubsService.unfollowClub(req.user!.id, id);
  }
}
