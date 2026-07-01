import {
  IsString,
  IsArray,
  ArrayMinSize,
  IsMongoId,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamDto {
  @IsString({ message: 'Team name must be a string' })
  @MinLength(1, { message: 'Team name is required' })
  name: string;

  @IsArray({ message: 'Members must be an array' })
  @ArrayMinSize(0, { message: 'Members can be empty' })
  members: string[];
}

export class CreateGameDto {
  @IsString({ message: 'Game name must be a string' })
  @MinLength(1, { message: 'Game name is required' })
  name: string;

  @IsArray({ message: 'Teams must be an array' })
  @ArrayMinSize(2, { message: 'Exactly 2 teams are required' })
  @ArrayMaxSize(2, { message: 'Exactly 2 teams are required' })
  @ValidateNested({ each: true })
  @Type(() => TeamDto)
  teams: TeamDto[];

  @IsArray({ message: 'Category IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least 1 category is required' })
  @IsMongoId({ each: true, message: 'Each category ID must be a valid MongoDB ID' })
  categoryIds: string[];
}

export class RevealAnswerDto {
  @IsMongoId({ message: 'Question ID must be a valid MongoDB ID' })
  questionId: string;
}

export class AwardPointsDto {
  @IsMongoId({ message: 'Question ID must be a valid MongoDB ID' })
  questionId: string;
}

export class SkipQuestionDto {
  @IsMongoId({ message: 'Question ID must be a valid MongoDB ID' })
  questionId: string;
}
