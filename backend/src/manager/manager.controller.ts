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
import { UserRole } from '../common/enums';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateRegistrationStatusDto } from './dto/update-registration-status.dto';

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
        return this.managerService.getAllManagedClubs(req.user.id);
    }

    @Get('clubs/:clubId')
    getManagedClubById(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
    ) {
        return this.managerService.getManagedClubById(req.user.id, clubId);
    }

    @Get('clubs/:clubId/events')
    getClubEvents(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
    ) {
        return this.managerService.getClubEvents(req.user.id, clubId);
    }

    @Get('clubs/:clubId/managers')
    getClubManagers(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
    ) {
        return this.managerService.getClubManagers(req.user.id, clubId);
    }

    @Delete('clubs/:clubId/managers/:managerId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeManager(
        @Req() req: AuthenticatedRequest,
        @Param('clubId', ParseIntPipe) clubId: number,
        @Param('managerId', ParseIntPipe) managerId: number,
    ) {
        return this.managerService.removeManager(req.user.id, clubId, managerId);
    }

    @Get('club')
    getClub(@Req() req: AuthenticatedRequest) {
        return this.managerService.getManagedClub(req.user.id);
    }

    @Put('club')
    updateClub(@Req() req: AuthenticatedRequest, @Body() updateClubDto: UpdateClubDto) {
        return this.managerService.updateClub(req.user.id, updateClubDto);
    }

    @Get('events')
    getAllEvents(@Req() req: AuthenticatedRequest) {
        return this.managerService.getAllEvents(req.user.id);
    }

    @Post('events')
    createEvent(@Req() req: AuthenticatedRequest, @Body() createEventDto: CreateEventDto) {
        return this.managerService.createEvent(req.user.id, createEventDto);
    }

    @Put('events/:id')
    updateEvent(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateEventDto: UpdateEventDto,
    ) {
        return this.managerService.updateEvent(req.user.id, id, updateEventDto);
    }

    @Delete('events/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteEvent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.deleteEvent(req.user.id, id);
    }

    @Patch('events/:id/publish')
    publishEvent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.publishEvent(req.user.id, id);
    }

    @Get('events/:id/registrations')
    getEventRegistrations(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.getEventRegistrations(req.user.id, id);
    }

    @Patch('registrations/:id/status')
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
