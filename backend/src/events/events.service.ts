import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  async getUpcomingEvents() {
    return [
      {
        id: 1,
        title: 'AI Workshop',
        date: new Date(),
        remainingPlaces: 12,
      },
    ];
  }
}
// This is just mock data that is going to change later on when the DB is finished and working