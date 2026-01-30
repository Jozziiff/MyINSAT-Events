import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { Event, Club, Registration, ClubManager, ClubJoinRequest } from '../entities';
import { ClubAccessGuard } from './guards/club-access.guard';

@Module({
    imports: [TypeOrmModule.forFeature([Event, Club, Registration, ClubManager, ClubJoinRequest])],
    controllers: [ManagerController],
    providers: [ManagerService, ClubAccessGuard],
    exports: [ClubAccessGuard, TypeOrmModule],
})
export class ManagerModule { }
