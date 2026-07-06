import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryBannerStorageService } from './category-banner-storage.service';
import { Catalog, CatalogSchema } from '../catalogs/schemas/catalog.schema';
import { LocalImageStorageService } from '../../common/uploads/local-image-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Catalog.name, schema: CatalogSchema },
    ]),
  ],
  providers: [CategoriesService, CategoryBannerStorageService, LocalImageStorageService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
