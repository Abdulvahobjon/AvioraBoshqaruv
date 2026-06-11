import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Query, Req, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ReviewApplicationDto } from './dto/application.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { uploadOptions } from '../common/upload.util';

@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  /** Public — anketa formasi uchun ma'lumotnomalar (regions/districts/positions). */
  @Get('meta')
  @Public()
  meta() {
    return this.applications.meta();
  }

  /** Public anketa — nomzod arizasi (rezyume PDF, max 10MB). */
  @Post()
  @Public()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('resume', uploadOptions(10)))
  create(@Body() body: any, @UploadedFile() file?: any) {
    if (file && file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Rezyume faqat PDF formatida bo\'lishi kerak');
    }
    const resumeUrl = file ? `/uploads/${file.filename}` : null;
    return this.applications.create(body, resumeUrl);
  }

  @Get()
  @ApiBearerAuth()
  @Roles('superadmin', 'admin', 'manager')
  findAll(@Query() q: any) {
    return this.applications.findAll(q);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin', 'manager')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applications.findOne(id);
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin', 'manager')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
  ) {
    return this.applications.review(id, dto, user, req.ip);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: any) {
    return this.applications.remove(id, user, req.ip);
  }
}
