import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Club } from '../entities/club.entity';
import { User } from '../entities/user.entity';
import { ClubManager } from '../entities/club-manager.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Club, User, ClubManager])],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
