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
import { MockManagerGuard } from './guards/mock-manager.guard';
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
@UseGuards(MockManagerGuard)
export class ManagerController {
    constructor(private readonly managerService: ManagerService) { }

    @Get('club')
    async getClub(@Req() req: AuthenticatedRequest) {
        return this.managerService.getManagedClub(req.user.id);
    }

    @Put('club')
    async updateClub(@Req() req: AuthenticatedRequest, @Body() updateClubDto: UpdateClubDto) {
        return this.managerService.updateClub(req.user.id, updateClubDto);
    }

    @Get('events')
    async getAllEvents(@Req() req: AuthenticatedRequest) {
        return this.managerService.getAllEvents(req.user.id);
    }

    @Post('events')
    async createEvent(@Req() req: AuthenticatedRequest, @Body() createEventDto: CreateEventDto) {
        return this.managerService.createEvent(req.user.id, createEventDto);
    }

    @Put('events/:id')
    async updateEvent(
        @Req() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateEventDto: UpdateEventDto,
    ) {
        return this.managerService.updateEvent(req.user.id, id, updateEventDto);
    }

    @Delete('events/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteEvent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        await this.managerService.deleteEvent(req.user.id, id);
    }

    @Patch('events/:id/publish')
    async publishEvent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.publishEvent(req.user.id, id);
    }

    @Get('events/:id/registrations')
    async getEventRegistrations(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.managerService.getEventRegistrations(req.user.id, id);
    }

    @Patch('registrations/:id/status')
    async updateRegistrationStatus(
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
