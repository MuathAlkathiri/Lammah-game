import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryBanner } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { CategoryBannerStorageService } from './category-banner-storage.service';
import { Catalog } from '../catalogs/schemas/catalog.schema';

interface UploadedBannerFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Catalog.name) private catalogModel: Model<Catalog>,
    private readonly bannerStorage: CategoryBannerStorageService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    bannerFile?: UploadedBannerFile,
  ): Promise<Category> {
    // Check if slug already exists
    const existingCategory = await this.categoryModel.findOne({
      slug: createCategoryDto.slug,
    });

    if (existingCategory) {
      throw new ConflictException('Category slug already exists');
    }

    const catalogId = await this.resolveCatalogId(createCategoryDto.catalogId, true);
    const banner = bannerFile ? await this.bannerStorage.save(bannerFile) : undefined;

    try {
      const category = await this.categoryModel.create({
        ...createCategoryDto,
        catalogId,
        ...(banner ? { banner } : {}),
      });
      return category.save();
    } catch (error) {
      await this.bannerStorage.delete(banner);
      throw error;
    }
  }

  async findAll(filters: { catalogId?: string } = {}): Promise<Category[]> {
    const query: Record<string, unknown> = {};

    if (filters.catalogId) {
      if (!Types.ObjectId.isValid(filters.catalogId)) {
        throw new NotFoundException(`Catalog with ID "${filters.catalogId}" not found`);
      }
      query.catalogId = filters.catalogId;
    }

    return this.categoryModel
      .find(query)
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate('catalog', '_id name slug')
      .exec();
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryModel
      .findById(id)
      .populate('catalog', '_id name slug')
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    bannerFile?: UploadedBannerFile,
  ): Promise<Category> {
    const existingCategory = await this.categoryModel.findById(id).exec();

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // If slug is being updated, check for uniqueness
    if (updateCategoryDto.slug) {
      const existingCategory = await this.categoryModel.findOne({
        slug: updateCategoryDto.slug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException('Category slug already exists');
      }
    }

    const catalogId =
      updateCategoryDto.catalogId !== undefined
        ? await this.resolveCatalogId(updateCategoryDto.catalogId)
        : undefined;
    const { catalogId: _catalogId, ...categoryPayload } = updateCategoryDto;
    let nextBanner: CategoryBanner | undefined;

    if (bannerFile) {
      nextBanner = await this.bannerStorage.save(bannerFile);
    }

    try {
      const category = await this.categoryModel.findByIdAndUpdate(
        id,
        {
          ...categoryPayload,
          ...(catalogId !== undefined ? { catalogId } : {}),
          ...(nextBanner ? { banner: nextBanner } : {}),
          updatedAt: new Date(),
        },
        { new: true, runValidators: true },
      );

      if (!category) {
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }

      if (nextBanner) {
        await this.bannerStorage.delete(existingCategory.banner);
      }

      return category;
    } catch (error) {
      await this.bannerStorage.delete(nextBanner);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    await this.bannerStorage.delete(result.banner);
  }

  private async resolveCatalogId(
    catalogId?: string | null,
    required = false,
  ): Promise<Types.ObjectId | null | undefined> {
    if (catalogId === undefined) {
      if (required) {
        throw new NotFoundException('Catalog ID is required');
      }
      return undefined;
    }

    if (catalogId === null || catalogId === '') {
      if (required) {
        throw new NotFoundException('Catalog ID is required');
      }
      return null;
    }

    if (!Types.ObjectId.isValid(catalogId)) {
      throw new NotFoundException(`Catalog with ID "${catalogId}" not found`);
    }

    const catalog = await this.catalogModel
      .findById(catalogId)
      .select('_id')
      .exec();

    if (!catalog) {
      throw new NotFoundException(`Catalog with ID "${catalogId}" not found`);
    }

    return catalog._id as Types.ObjectId;
  }
}
