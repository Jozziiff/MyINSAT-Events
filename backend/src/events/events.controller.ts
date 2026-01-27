import { Controller, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  getAllEvents() {
    return this.eventsService.getAllEvents();
  }

  @Get('upcoming')
  getUpcomingEvents() {
    return this.eventsService.getUpcomingEvents();
  }

  @Get(':id')
  async getEventById(@Param('id', ParseIntPipe) id: number) {
    const event = await this.eventsService.getEventById(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }
}