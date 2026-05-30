import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators/roles.decorator';

const ALLOWED = ['region', 'position', 'projectType', 'expenseCategory'] as const;
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
  findAll(@Param('model') model: string) {
    return this.settings.findAll(assertModel(model));
  }

  @Post(':model')
  @Roles('superadmin', 'admin')
  create(@Param('model') model: string, @Body('name') name: string) {
    return this.settings.create(assertModel(model), name);
  }

  @Patch(':model/:id')
  @Roles('superadmin', 'admin')
  update(@Param('model') model: string, @Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.settings.update(assertModel(model), id, name);
  }

  @Delete(':model/:id')
  @Roles('superadmin', 'admin')
  remove(@Param('model') model: string, @Param('id', ParseIntPipe) id: number) {
    return this.settings.remove(assertModel(model), id);
  }
}
