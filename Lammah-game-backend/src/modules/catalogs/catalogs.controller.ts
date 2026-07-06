import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ids, catalogExample } from '../../common/swagger/examples';
import { UserRole } from '../users/schemas/user.schema';
import { CatalogsService } from './catalogs.service';
import {
  CatalogMultipartBodyDto,
  CreateCatalogDto,
  UpdateCatalogDto,
} from './dto/catalog.dto';
import { Catalog } from './schemas/catalog.schema';

interface UploadedBannerFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const catalogBannerUploadInterceptor = FileInterceptor('banner', {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!/^image\/(jpe?g|png|webp)$/.test(file.mimetype)) {
      callback(
        new BadRequestException('Banner must be a jpg, jpeg, png, or webp image'),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all catalogs' })
  @ApiResponse({
    status: 200,
    description: 'Catalogs retrieved successfully',
    schema: { example: { statusCode: 200, data: [catalogExample] } },
  })
  async findAll(): Promise<{ statusCode: number; data: Catalog[] }> {
    const catalogs = await this.catalogsService.findAll();
    return { statusCode: HttpStatus.OK, data: catalogs };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific catalog by ID' })
  @ApiParam({ name: 'id', example: ids.catalog })
  @ApiResponse({
    status: 200,
    description: 'Catalog retrieved successfully',
    schema: { example: { statusCode: 200, data: catalogExample } },
  })
  async findById(
    @Param('id') id: string,
  ): Promise<{ statusCode: number; data: Catalog }> {
    const catalog = await this.catalogsService.findById(id);
    return { statusCode: HttpStatus.OK, data: catalog };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(catalogBannerUploadInterceptor)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new catalog' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    type: CatalogMultipartBodyDto,
    examples: {
      multipart: {
        summary: 'Multipart catalog with optional banner',
        value: {
          catalog: JSON.stringify({
            name: { ar: 'رياضة', en: 'Sports' },
            description: {
              ar: 'أسئلة رياضية متنوعة',
              en: 'Various sports questions',
            },
            slug: 'sports',
            icon: 'trophy',
            isActive: true,
            sortOrder: 1,
          }),
        },
      },
    },
  })
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFile() banner?: UploadedBannerFile,
  ): Promise<{ statusCode: number; message: string; data: Catalog }> {
    const dto = this.parseAndValidateCatalogBody(body, CreateCatalogDto);
    const catalog = await this.catalogsService.create(dto, banner);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Catalog created successfully',
      data: catalog,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(catalogBannerUploadInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a catalog' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiParam({ name: 'id', example: ids.catalog })
  @ApiBody({ type: CatalogMultipartBodyDto })
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() banner?: UploadedBannerFile,
  ): Promise<{ statusCode: number; message: string; data: Catalog }> {
    const dto = this.parseAndValidateCatalogBody(body, UpdateCatalogDto);
    const catalog = await this.catalogsService.update(id, dto, banner);
    return {
      statusCode: HttpStatus.OK,
      message: 'Catalog updated successfully',
      data: catalog,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a catalog' })
  @ApiParam({ name: 'id', example: ids.catalog })
  @ApiResponse({ status: 204, description: 'Catalog deleted successfully' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete catalog because it has linked categories.',
  })
  async delete(@Param('id') id: string): Promise<void> {
    await this.catalogsService.delete(id);
  }

  private parseAndValidateCatalogBody<T extends object>(
    body: Record<string, unknown>,
    DtoClass: new () => T,
  ): T {
    const rawCatalog = body.catalog;
    let payload: unknown = body;

    if (rawCatalog !== undefined) {
      if (typeof rawCatalog !== 'string') {
        throw new BadRequestException('catalog must be a JSON string');
      }

      try {
        payload = JSON.parse(rawCatalog);
      } catch {
        throw new BadRequestException('catalog must be valid JSON');
      }
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('catalog payload must be an object');
    }

    const dto = plainToInstance(DtoClass, payload);
    const validationErrors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length) {
      throw new BadRequestException(validationErrors);
    }

    return dto;
  }
}
