import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get current user's profile
  @Get('me')
  @UseGuards(JwtAccessGuard)
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  // Update current user's profile
  @Put('me')
  @UseGuards(JwtAccessGuard)
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, updateDto);
  }

  // Get current user's dashboard data
  @Get('me/dashboard')
  @UseGuards(JwtAccessGuard)
  getDashboard(@Req() req: AuthenticatedRequest) {
    return this.usersService.getDashboard(req.user.id);
  }

  // Get current user's upcoming events
  @Get('me/events/upcoming')
  @UseGuards(JwtAccessGuard)
  getUpcomingEvents(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserUpcomingEvents(req.user.id);
  }

  // Get current user's past events
  @Get('me/events/past')
  @UseGuards(JwtAccessGuard)
  getPastEvents(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserRecentEvents(req.user.id);
  }

  // Get all current user's registrations
  @Get('me/registrations')
  @UseGuards(JwtAccessGuard)
  getAllRegistrations(@Req() req: AuthenticatedRequest) {
    return this.usersService.getAllRegistrations(req.user.id);
  }

  // Get current user's followed clubs
  @Get('me/clubs')
  @UseGuards(JwtAccessGuard)
  getFollowedClubs(@Req() req: AuthenticatedRequest) {
    return this.usersService.getFollowedClubs(req.user.id);
  }

  // Follow a club
  @Post('me/clubs/:clubId/follow')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  followClub(
    @Req() req: AuthenticatedRequest,
    @Param('clubId', ParseIntPipe) clubId: number,
  ) {
    return this.usersService.followClub(req.user.id, clubId);
  }

  // Unfollow a club
  @Delete('me/clubs/:clubId/follow')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowClub(
    @Req() req: AuthenticatedRequest,
    @Param('clubId', ParseIntPipe) clubId: number,
  ) {
    return this.usersService.unfollowClub(req.user.id, clubId);
  }

  // Check if following a club
  @Get('me/clubs/:clubId/following')
  @UseGuards(JwtAccessGuard)
  async isFollowingClub(
    @Req() req: AuthenticatedRequest,
    @Param('clubId', ParseIntPipe) clubId: number,
  ) {
    const isFollowing = await this.usersService.isFollowingClub(req.user.id, clubId);
    return { isFollowing };
  }

  // Get current user's ratings
  @Get('me/ratings')
  @UseGuards(JwtAccessGuard)
  getUserRatings(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserRatings(req.user.id);
  }

  // Get user's registration for a specific event
  @Get('me/events/:eventId/registration')
  @UseGuards(JwtAccessGuard)
  getEventRegistration(
    @Req() req: AuthenticatedRequest,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.usersService.getEventRegistration(req.user.id, eventId);
  }

  // Public route - Get any user's public profile (must be LAST to not conflict with 'me' routes)
  @Get(':id/profile')
  getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPublicProfile(id);
  }
}
