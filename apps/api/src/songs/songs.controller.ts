import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SongsService } from './songs.service.js';

@Controller('songs')
export class SongsController {
  constructor(private readonly songs: SongsService) {}

  @Post('requests')
  create(@Body() body: { childId: string; habitId: string; prompt: string }) {
    return this.songs.createRequest(body);
  }

  @Get('pending')
  pending() {
    return this.songs.listPending();
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.songs.review(id, body.approved);
  }
}
