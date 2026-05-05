import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'crypto';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const cloudinaryFolder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'personal/products';

type UploadedProductImage = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
  resource_type: string;
};

@Controller('products/images')
@UseGuards(JwtAuthGuard)
export class ProductImagesController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException('Only JPG, PNG, WEBP, and GIF images are allowed'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file?: UploadedProductImage) {
    if (!file) throw new BadRequestException('Image file is required');

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createCloudinarySignature({ folder: cloudinaryFolder, timestamp }, apiSecret);
    const fileDataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const form = new FormData();
    form.append('file', fileDataUri);
    form.append('api_key', apiKey);
    form.append('timestamp', timestamp);
    form.append('folder', cloudinaryFolder);
    form.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new InternalServerErrorException(`Cloudinary upload failed${errorBody ? `: ${errorBody}` : ''}`);
    }

    const result = (await response.json()) as CloudinaryUploadResponse;

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: result.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: result.bytes ?? file.size,
      width: result.width,
      height: result.height,
      format: result.format,
      provider: 'cloudinary',
      folder: cloudinaryFolder,
    };
  }
}

function createCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}
