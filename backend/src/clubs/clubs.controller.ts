import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  // Get all clubs (summary for list page)
  @Get()
  getAllClubs() {
    return this.clubsService.getAllClubs();
  }

  // Get full club details
  @Get(':id')
  async getClubById(@Param('id', ParseIntPipe) id: number) {
    const club = await this.clubsService.getClubById(id);
    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return club;
  }

  // Create a new club (owner only)
  // Note: In production, use proper auth guards instead of headers
  @Post()
  createClub(
    @Body() createClubDto: CreateClubDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    return this.clubsService.createClub(
      createClubDto,
      parseInt(userId) || 0,
      userRole || '',
    );
  }

  // Update a club (owner only)
  @Put(':id')
  async updateClub(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateClubDto>,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    const club = await this.clubsService.updateClub(
      id,
      updateData,
      parseInt(userId) || 0,
      userRole || '',
    );
    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return club;
  }

  // Delete a club (owner only)
  @Delete(':id')
  async deleteClub(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    const deleted = await this.clubsService.deleteClub(
      id,
      parseInt(userId) || 0,
      userRole || '',
    );
    if (!deleted) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return { deleted: true };
  }

  // Get club events with statistics
  @Get(':id/events')
  async getClubEvents(@Param('id', ParseIntPipe) id: number) {
    const events = await this.clubsService.getClubEventsWithStats(id);
    if (!events) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return events;
  }
}
