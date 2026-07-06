import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LocalImageStorageService,
} from '../../common/uploads/local-image-storage.service';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { Catalog, CatalogSchema } from './schemas/catalog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Catalog.name, schema: CatalogSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [CatalogsService, LocalImageStorageService],
  controllers: [CatalogsController],
  exports: [CatalogsService],
})
export class CatalogsModule {}
