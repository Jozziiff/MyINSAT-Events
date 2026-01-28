import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { EventsService } from './events.service';
import { RateEventDto } from './dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @Get()
  @UseGuards(OptionalAuth)
  getAllEvents(@Req() req: AuthenticatedRequest) {
    return this.eventsService.getAllEvents(req.user?.id);
  }

  @Get('upcoming')
  @UseGuards(OptionalAuth)
  getUpcomingEvents(@Req() req: AuthenticatedRequest) {
    return this.eventsService.getUpcomingEvents(req.user?.id);
  }

  @Get('trending')
  @UseGuards(OptionalAuth)
  getTrendingEvents(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.eventsService.getTrendingEvents(req.user?.id, parsedLimit);
  }

  @Get(':id')
  @UseGuards(OptionalAuth)
  async getEventById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.getEventById(id, req.user?.id);
  }

  @Get(':id/ratings')
  getEventRatings(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.getEventRatings(id);
  }

  // User rates an event (only if attended)
  @Post(':id/rate')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  rateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() rateEventDto: RateEventDto,
  ) {
    return this.eventsService.rateEvent(id, req.user!.id, rateEventDto);
  }

  // Get user's registration for an event
  @Get(':id/my-registration')
  @UseGuards(JwtAccessGuard)
  getUserRegistration(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.getUserRegistration(id, req.user!.id);
  }

  // Register/update registration for an event
  // Supports statuses: INTERESTED (initial), PENDING_PAYMENT (paid events), CONFIRMED (final)
  @Post(':id/register')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  registerForEvent(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() body: { status: string },
  ) {
    return this.eventsService.registerForEvent(id, req.user!.id, body.status);
  }

  // Cancel registration for an event
  @Delete(':id/register')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelRegistration(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.cancelRegistration(id, req.user!.id);
  }
}