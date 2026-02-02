import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Club, ClubManager } from '../clubs/entities';
import { User } from '../users/entities';

@Module({
    imports: [TypeOrmModule.forFeature([Club, User, ClubManager])],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
