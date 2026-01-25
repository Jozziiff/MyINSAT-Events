import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { Event, Club, Registration, ClubManager } from '../entities';

@Module({
    imports: [TypeOrmModule.forFeature([Event, Club, Registration, ClubManager])],
    controllers: [ManagerController],
    providers: [ManagerService],
})
export class ManagerModule { }
