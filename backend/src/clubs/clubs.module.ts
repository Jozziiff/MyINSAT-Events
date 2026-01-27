
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { Club } from '../entities/club.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Club, Event, Registration])],
  controllers: [ClubsController],
  providers: [ClubsService],
})
export class ClubsModule {}
