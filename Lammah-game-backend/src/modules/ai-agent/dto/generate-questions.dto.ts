import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class GenerateQuestionsDto {
  @IsMongoId({ message: 'Category ID must be a valid MongoDB ID' })
  categoryId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Count must be an integer' })
  @Min(1, { message: 'Count must be at least 1' })
  @Max(20, { message: 'Count cannot be more than 20' })
  count?: number;
}
