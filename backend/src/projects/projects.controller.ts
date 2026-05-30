import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.projects.findAll(user, q);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.projects.findOne(id, user);
  }

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.projects.create(dto, user, req.ip);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.projects.update(id, dto, user, req.ip);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.projects.remove(id, user, req.ip);
  }
}
