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
import { ApiProperty } from '@nestjs/swagger';

export class TeamDto {
  @ApiProperty()
  @IsString({ message: 'Team name must be a string' })
  @MinLength(1, { message: 'Team name is required' })
  name: string;

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Members must be an array' })
  @ArrayMinSize(0, { message: 'Members can be empty' })
  members: string[];
}

export class CreateGameDto {
  @ApiProperty()
  @IsString({ message: 'Game name must be a string' })
  @MinLength(1, { message: 'Game name is required' })
  name: string;

  @ApiProperty({ type: [TeamDto], minItems: 2, maxItems: 2 })
  @IsArray({ message: 'Teams must be an array' })
  @ArrayMinSize(2, { message: 'Exactly 2 teams are required' })
  @ArrayMaxSize(2, { message: 'Exactly 2 teams are required' })
  @ValidateNested({ each: true })
  @Type(() => TeamDto)
  teams: TeamDto[];

  @ApiProperty({ type: [String], minItems: 1 })
  @IsArray({ message: 'Category IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least 1 category is required' })
  @IsMongoId({
    each: true,
    message: 'Each category ID must be a valid MongoDB ID',
  })
  categoryIds: string[];
}

export class RevealAnswerDto {
  @ApiProperty()
  @IsMongoId({ message: 'Question ID must be a valid MongoDB ID' })
  questionId: string;
}

export class AwardPointsDto {
  @ApiProperty()
  @IsMongoId({ message: 'Question ID must be a valid MongoDB ID' })
  questionId: string;
}

export class SkipQuestionDto {
  @ApiProperty()
  @IsMongoId({ message: 'Question ID must be a valid MongoDB ID' })
  questionId: string;
}
