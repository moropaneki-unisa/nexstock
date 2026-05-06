import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AdjustInventoryDto,
  CreateProductDto,
  ListProductsDto,
  UpdateProductDto,
} from './dto';
import { ProductsImportExportService } from './products-import-export.service';
import { ProductsService } from './products.service';

type ProductImportFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly importExport: ProductsImportExportService,
  ) {}

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.products.uploadImage(file);
  }

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProductsDto,
  ) {
    return this.products.list(user.organizationId, query);
  }

  @Get('export/file')
  async exportProducts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('format') format: 'csv' | 'xlsx' | undefined,
    @Res() response: Response,
  ) {
    const file = await this.importExport.exportProducts(user.organizationId, format === 'xlsx' ? 'xlsx' : 'csv');
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename=\"${file.fileName}\"`);
    response.send(file.buffer);
  }

  @Post('import/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  importProducts(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file?: ProductImportFile,
  ) {
    return this.importExport.importProducts(user.organizationId, file as ProductImportFile);
  }

  @Get(':id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.products.get(user.organizationId, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.organizationId, id, dto);
  }

  @Post(':id/adjust')
  adjust(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.products.adjustInventory(user.organizationId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.products.softDelete(user.organizationId, id);
  }
}
