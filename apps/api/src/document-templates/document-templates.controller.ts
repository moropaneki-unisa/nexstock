import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateDocumentTemplateDto, PreviewDocumentTemplateDto, UpdateDocumentTemplateDto } from './dto';
import { DocumentTemplatesService } from './document-templates.service';

@Controller('document-templates')
@UseGuards(JwtAuthGuard)
export class DocumentTemplatesController {
  constructor(private readonly templates: DocumentTemplatesService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.templates.list(user);
  }

  @Get('fields')
  fields(@CurrentUser() user: CurrentUserPayload, @Query('module') module = 'purchase_orders') {
    return this.templates.fields(user, module);
  }

  @Post('preview')
  preview(@CurrentUser() user: CurrentUserPayload, @Body() dto: PreviewDocumentTemplateDto) {
    return this.templates.preview(user, dto);
  }

  @Post('preview/render')
  previewLegacy(@CurrentUser() user: CurrentUserPayload, @Body() dto: PreviewDocumentTemplateDto) {
    return this.templates.preview(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.templates.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDocumentTemplateDto) {
    return this.templates.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateDocumentTemplateDto) {
    return this.templates.update(user, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.templates.delete(user, id);
  }
}
