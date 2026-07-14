import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { QuestionRepository } from '../../questions/persistence/question.repository';
import {
  Question,
  QuestionPoints,
} from '../../questions/schemas/question.schema';

@Injectable()
export class QuestionSelectorService {
  constructor(private readonly questions: QuestionRepository) {}

  async select(options: {
    categoryId: string;
    points: QuestionPoints;
    isFreeGame: boolean;
    seenQuestionIds: Types.ObjectId[];
  }): Promise<Question[]> {
    const candidates = await this.questions.findEligibleForGame({
      categoryId: options.categoryId,
      points: options.points,
      freeGameOnly: options.isFreeGame,
    });

    if (options.isFreeGame) return candidates.slice(0, 2);

    const seen = new Set(options.seenQuestionIds.map(String));
    const unseen = candidates.filter(
      (question) => !seen.has(String(question._id)),
    );
    const source = unseen.length >= 2 ? unseen : candidates;
    return this.shuffle(source).slice(0, 2);
  }

  private shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }
    return shuffled;
  }
}
