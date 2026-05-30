import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('todos')
@ApiBearerAuth()
@Controller('todos')
export class TodosController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser('id') userId: number) {
    return this.prisma.todo.findMany({ where: { userId }, orderBy: [{ isDone: 'asc' }, { createdAt: 'desc' }] });
  }

  @Post()
  create(@CurrentUser('id') userId: number, @Body('title') title: string) {
    return this.prisma.todo.create({ data: { userId, title: (title || '').trim() } });
  }

  @Patch(':id')
  async toggle(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number, @Body() body: any) {
    await this.prisma.todo.updateMany({
      where: { id, userId },
      data: { isDone: body.isDone !== undefined ? body.isDone : undefined, title: body.title },
    });
    return this.prisma.todo.findFirst({ where: { id, userId } });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    await this.prisma.todo.deleteMany({ where: { id, userId } });
    return { message: 'O\'chirildi' };
  }
}
