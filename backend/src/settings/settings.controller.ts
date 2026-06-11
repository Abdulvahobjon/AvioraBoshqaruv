import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators/roles.decorator';

const ALLOWED = ['region', 'district', 'position', 'projectType', 'expenseCategory'] as const;
type RefModel = (typeof ALLOWED)[number];

function assertModel(model: string): RefModel {
  if (!ALLOWED.includes(model as RefModel)) {
    throw new BadRequestException('Noma\'lum ma\'lumotnoma: ' + model);
  }
  return model as RefModel;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Read: barcha autentifikatsiyalangan foydalanuvchilar (dropdownlar uchun)
  @Get(':model')
  findAll(@Param('model') model: string, @Query() q: any) {
    return this.settings.findAll(assertModel(model), q);
  }

  // Yozish: admin/manager/superadmin (TZ 8.1/8.3 cheklovi)
  @Post(':model')
  @Roles('superadmin', 'admin', 'manager')
  create(@Param('model') model: string, @Body() body: any) {
    return this.settings.create(assertModel(model), body);
  }

  @Patch(':model/:id')
  @Roles('superadmin', 'admin', 'manager')
  update(@Param('model') model: string, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.settings.update(assertModel(model), id, body);
  }

  @Delete(':model/:id')
  @Roles('superadmin', 'admin', 'manager')
  remove(@Param('model') model: string, @Param('id', ParseIntPipe) id: number) {
    return this.settings.remove(assertModel(model), id);
  }
}
