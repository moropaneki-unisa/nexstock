import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Express } from 'express';
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
import { CreateProductTypeDto, UpdateProductTypeDto } from './product-types.dto';
import { ProductTypesService } from './product-types.service';
import { ProductsImportExportService } from './products-import-export.service';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly importExport: ProductsImportExportService,
    private readonly productTypes: ProductTypesService,
  ) {}

  @Post('asset-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadFieldImage(@UploadedFile() file: Express.Multer.File) {
    return this.products.uploadImage(file);
  }

  @Post('asset-attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadFieldAttachment(@UploadedFile() file: Express.Multer.File) {
    return this.products.uploadAttachment(file);
  }

  @Post(':id/upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProductImage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.products.uploadAndAttachImage(
      user.organizationId,
      productId,
      file,
    );
  }

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProductsDto,
  ) {
    return this.products.list(user.organizationId, query);
  }

  @Get('types')
  listTypes(@CurrentUser() user: CurrentUserPayload) {
    return this.productTypes.list(user.organizationId);
  }

  @Post('types')
  createType(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProductTypeDto) {
    return this.productTypes.create(user.organizationId, dto);
  }

  @Get('types/:typeId')
  getType(@CurrentUser() user: CurrentUserPayload, @Param('typeId') typeId: string) {
    return this.productTypes.get(user.organizationId, typeId);
  }

  @Patch('types/:typeId')
  updateType(
    @CurrentUser() user: CurrentUserPayload,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateProductTypeDto,
  ) {
    return this.productTypes.update(user.organizationId, typeId, dto);
  }

  @Delete('types/:typeId')
  deleteType(@CurrentUser() user: CurrentUserPayload, @Param('typeId') typeId: string) {
    return this.productTypes.delete(user.organizationId, typeId);
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
