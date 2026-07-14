import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Game, QuestionInGame } from '../schemas/game.schema';

@Injectable()
export class GameActionPolicy {
  findQuestion(game: Game, questionId: Types.ObjectId): QuestionInGame {
    const question = game.board
      .flatMap((category) => category.questions)
      .find((candidate) => candidate.question.equals(questionId));
    if (!question)
      throw new BadRequestException('Question not found in this game board');
    return question;
  }

  assertUnanswered(question: QuestionInGame): void {
    if (question.isAnswered)
      throw new BadRequestException('Question is already answered');
  }
}
