import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    UseGuards,
    Req,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ManagerService } from './manager.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateRegistrationStatusDto } from './dto/update-registration-status.dto';
import { ClubAccessGuard } from './guards/club-access.guard';

interface AuthenticatedRequest extends Request {
    user: {
        id: number;
        email: string;
        role: string;
        clubId: number;
    };
}

@Controller('manager')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN)
export class ManagerController {
    constructor(private readonly managerService: ManagerService) { }

    @Get('clubs')
    getAllManagedClubs(@Req() req: AuthenticatedRequest) {
        return this.managerService.getAllManagedClubs(req.user.id, req.user.role);
    }

    @Get('clubs/:clubId')
    @UseGuards(ClubAccessGuard)
    getManagedClubById(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
    ) {
        return this.managerService.getManagedClubById(req.user.id, clubId);
    }

    @Get('clubs/:clubId/events')
    @UseGuards(ClubAccessGuard)
    getClubEvents(
        @Param('clubId', ParseIntPipe) clubId: number,
    ) {
        return this.managerService.getClubEvents(clubId);
    }

    @Get('clubs/:clubId/managers')
    @UseGuards(ClubAccessGuard)
    getClubManagers(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
    ) {
        return this.managerService.getClubManagers(req.user.id, clubId);
    }

    @Delete('clubs/:clubId/managers/:managerId')
    @UseGuards(ClubAccessGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    removeManager(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
        @Param('managerId', ParseIntPipe) managerId: number,
    ) {
        return this.managerService.removeManager(req.user.id, clubId, managerId);
    }

    @Put('clubs/:clubId')
    @UseGuards(ClubAccessGuard)
    updateClub(
        @Param('clubId', ParseIntPipe) clubId: number,
        @Body() updateClubDto: UpdateClubDto,
    ) {
        return this.managerService.updateClub(clubId, updateClubDto);
    }

    @Post('events')
    @UseGuards(ClubAccessGuard)
    createEvent(@Req() req: AuthenticatedRequest, @Body() createEventDto: CreateEventDto) {
        return this.managerService.createEvent(createEventDto);
    }

    @Put('events/:id')
    @UseGuards(ClubAccessGuard)
    updateEvent(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateEventDto: UpdateEventDto,
    ) {
        return this.managerService.updateEvent(req.user.id, id, updateEventDto);
    }

    @Delete('events/:id')
    @UseGuards(ClubAccessGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteEvent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.deleteEvent(req.user.id, id);
    }

    @Patch('events/:id/publish')
    @UseGuards(ClubAccessGuard)
    publishEvent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.publishEvent(req.user.id, id);
    }

    @Get('events/:id/registrations')
    @UseGuards(ClubAccessGuard)
    getEventRegistrations(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.getEventRegistrations(req.user.id, id);
    }

    @Patch('registrations/:id/status')
    @UseGuards(ClubAccessGuard)
    updateRegistrationStatus(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStatusDto: UpdateRegistrationStatusDto,
    ) {
        return this.managerService.updateRegistrationStatus(
            req.user.id,
            id,
            updateStatusDto.status,
        );
    }
}
