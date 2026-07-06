import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsMongoId,
  IsNumber,
  MinLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Science' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiProperty({ example: 'science' })
  @IsString({ message: 'Slug must be a string' })
  @MinLength(1, { message: 'Slug is required' })
  slug: string;

  @ApiPropertyOptional({ example: 'Science and discovery questions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '66b8f5f2c9d7a8b1e3f00223',
    description: 'Catalog ID that this category belongs to',
  })
  @IsMongoId()
  catalogId: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Science Updated' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'science-updated' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @ApiPropertyOptional({ example: 'Updated science category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '66b8f5f2c9d7a8b1e3f00223',
    description: 'Catalog ID that this category belongs to. Send null to detach.',
    nullable: true,
  })
  @IsOptional()
  @IsMongoId()
  catalogId?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CategoryMultipartBodyDto {
  @ApiProperty({
    description: 'JSON string containing CreateCategoryDto or UpdateCategoryDto fields',
    example: JSON.stringify({
      name: 'Science',
      slug: 'science',
      description: 'Science and discovery questions',
      catalogId: '66b8f5f2c9d7a8b1e3f00223',
      sortOrder: 0,
      isActive: true,
    }),
  })
  category: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional category banner image (jpg, jpeg, png, webp)',
  })
  banner?: unknown;
}
