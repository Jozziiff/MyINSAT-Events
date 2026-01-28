import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ClubStatus } from '../common/enums/club-status.enum';

@Controller('admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // Get all pending clubs
    @Get('clubs/pending')
    async getPendingClubs() {
        return this.adminService.getPendingClubs();
    }

    // Get all clubs (optionally filtered by status)
    @Get('clubs')
    async getAllClubs(@Query('status') status?: ClubStatus) {
        return this.adminService.getAllClubs(status);
    }

    // Approve a club
    @Patch('clubs/:id/approve')
    async approveClub(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.approveClub(id);
    }

    // Reject a club
    @Patch('clubs/:id/reject')
    async rejectClub(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.rejectClub(id);
    }
}
