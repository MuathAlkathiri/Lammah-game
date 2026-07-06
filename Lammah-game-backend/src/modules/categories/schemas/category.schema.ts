import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Catalog } from '../../catalogs/schemas/catalog.schema';

export class CategoryBanner {
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
}

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: Catalog.name, default: null })
  catalogId?: Types.ObjectId | Catalog | null;

  catalog?: Catalog | null;

  @Prop({
    type: {
      filename: { type: String, required: true },
      path: { type: String, required: true },
      url: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
    },
    required: false,
    _id: false,
  })
  banner?: CategoryBanner;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.virtual('catalog', {
  ref: Catalog.name,
  localField: 'catalogId',
  foreignField: '_id',
  justOne: true,
});
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });
