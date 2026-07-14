import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { QuestionResponseDto } from '../../questions/dto/question-response.dto';

export class GameTeamResponseDto {
  @ApiPropertyOptional() _id?: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String] }) members!: string[];
  @ApiProperty() score!: number;
}

export class GameBoardQuestionResponseDto {
  @ApiPropertyOptional() _id?: string;
  @ApiProperty({ type: QuestionResponseDto })
  question!: QuestionResponseDto;
  @ApiProperty({ enum: [200, 400, 600] }) points!: 200 | 400 | 600;
  @ApiProperty() isAnswered!: boolean;
  @ApiProperty() isAnswerRevealed!: boolean;
  @ApiPropertyOptional() answeredByTeamIndex?: number;
  @ApiPropertyOptional() awardedPoints?: number;
}

export class GameCategoryBoardResponseDto {
  @ApiProperty({ type: CategoryResponseDto })
  category!: CategoryResponseDto;
  @ApiProperty({ type: [GameBoardQuestionResponseDto] })
  questions!: GameBoardQuestionResponseDto[];
}

export class GameResponseDto {
  @ApiProperty() _id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['waiting', 'active', 'finished'] }) status!: string;
  @ApiProperty({ type: [GameTeamResponseDto] }) teams!: GameTeamResponseDto[];
  @ApiProperty({ type: [CategoryResponseDto] })
  selectedCategories!: CategoryResponseDto[];
  @ApiProperty({ type: [GameCategoryBoardResponseDto] })
  board!: GameCategoryBoardResponseDto[];
  @ApiProperty() currentTurnTeamIndex!: number;
  @ApiPropertyOptional() finishedAt?: string;
  @ApiPropertyOptional() createdAt?: string;
  @ApiPropertyOptional() updatedAt?: string;
}

export class GameListResponseDto {
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty({ type: [GameResponseDto] }) data!: GameResponseDto[];
}

export class GameDetailResponseDto {
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty({ type: GameResponseDto }) data!: GameResponseDto;
}

export class GameMutationResponseDto extends GameDetailResponseDto {
  @ApiProperty() message!: string;
}
