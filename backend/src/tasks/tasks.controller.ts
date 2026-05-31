import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req,
  UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeStatusDto, ReviewTaskDto, CreateCommentDto } from './dto/task-actions.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

const uploadStorage = diskStorage({
  destination: process.env.UPLOAD_DIR || 'uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('board')
  board(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.tasks.board(user, q);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.tasks.findAll(user, q);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.tasks.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.tasks.create(dto, user, req.ip);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.tasks.update(id, dto, user, req.ip);
  }

  @Patch(':id/status')
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatusDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.tasks.changeStatus(id, dto, user, req.ip);
  }

  @Post(':id/review')
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewTaskDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.tasks.review(id, dto, user, req.ip);
  }

  @Post(':id/comments')
  addComment(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCommentDto, @CurrentUser() user: AuthUser) {
    return this.tasks.addComment(id, dto, user);
  }

  @Post(':id/files')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage, limits: { fileSize: 20 * 1024 * 1024 } }))
  addFile(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: any, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return this.tasks.addFile(id, file, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.tasks.remove(id, user, req.ip);
  }
}
