import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { Club, Event, Registration, ClubFollower, ClubManager, ClubJoinRequest, EventRating } from '../entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Club, Event, Registration, ClubFollower, ClubManager, ClubJoinRequest, EventRating]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ClubsController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule { }
