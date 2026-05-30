import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.users.create(dto, actorId, req.ip);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.users.update(id, dto, actorId, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.users.remove(id, actorId, req.ip);
  }
}
