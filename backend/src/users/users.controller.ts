import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req,
  UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { uploadOptions } from '../common/upload.util';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@Roles('superadmin', 'admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@Query() q: PaginationDto) {
    return this.users.findAll(q);
  }

  /** Upload an avatar / passport file before (or while) saving a user → returns its URL. */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', uploadOptions(10)))
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return { url: `/uploads/${file.filename}`, name: file.originalname, size: file.size };
  }

  /** Yengil ro'yxat (dropdownlar): ?role= bilan filtr. */
  @Get('all')
  @Roles('superadmin', 'admin', 'manager', 'auditor', 'accountant')
  all(@Query('role') role?: string) {
    return this.users.findAllLight(role);
  }

  /** O'z unumdorligi (KPI) — barcha rollar. */
  @Get('me/efficiency')
  @Roles('superadmin', 'admin', 'manager', 'employee', 'accountant', 'auditor')
  myEfficiency(@CurrentUser('id') userId: number) {
    return this.users.efficiency(userId);
  }

  /** Boshqa xodim unumdorligi — boshqaruv/nazorat rollari. */
  @Get(':id/efficiency')
  @Roles('superadmin', 'admin', 'manager', 'auditor')
  userEfficiency(@Param('id', ParseIntPipe) id: number) {
    return this.users.efficiency(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.users.create(dto, actor.id, actor.role, req.ip);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.users.update(id, dto, actor.id, actor.role, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.users.remove(id, actor.id, actor.role, req.ip);
  }
}
