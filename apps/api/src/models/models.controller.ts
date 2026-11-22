import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ModelDto } from './dto/model.dto.js';
import { ModelsService } from './models.service.js';

@ApiTags('models')
@Controller('models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get(':code')
  @ApiOkResponse({ type: ModelDto })
  @ApiNotFoundResponse({ description: 'No model with this code' })
  findOne(@Param('code') code: string): Promise<ModelDto> {
    return this.models.findByCode(code);
  }
}
