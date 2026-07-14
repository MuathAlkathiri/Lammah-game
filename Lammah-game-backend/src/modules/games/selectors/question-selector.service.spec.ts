import { Types } from 'mongoose';
import { QuestionRepository } from '../../questions/persistence/question.repository';
import { QuestionPoints } from '../../questions/schemas/question.schema';
import { QuestionSelectorService } from './question-selector.service';

describe('QuestionSelectorService', () => {
  const question = (id: Types.ObjectId) => ({ _id: id });

  it('excludes seen questions when two unseen candidates are available', async () => {
    const seen = new Types.ObjectId();
    const unseenA = new Types.ObjectId();
    const unseenB = new Types.ObjectId();
    const repository = {
      findEligibleForGame: jest
        .fn()
        .mockResolvedValue([
          question(seen),
          question(unseenA),
          question(unseenB),
        ]),
    } as unknown as QuestionRepository;
    const selector = new QuestionSelectorService(repository);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const selected = await selector.select({
      categoryId: new Types.ObjectId().toString(),
      points: QuestionPoints.LOW,
      isFreeGame: false,
      seenQuestionIds: [seen],
    });

    expect(selected.map((item) => String(item._id)).sort()).toEqual(
      [String(unseenA), String(unseenB)].sort(),
    );
    jest.restoreAllMocks();
  });

  it('keeps fixed free-game ordering', async () => {
    const ids = [
      new Types.ObjectId(),
      new Types.ObjectId(),
      new Types.ObjectId(),
    ];
    const repository = {
      findEligibleForGame: jest.fn().mockResolvedValue(ids.map(question)),
    } as unknown as QuestionRepository;
    const selector = new QuestionSelectorService(repository);
    const selected = await selector.select({
      categoryId: new Types.ObjectId().toString(),
      points: QuestionPoints.LOW,
      isFreeGame: true,
      seenQuestionIds: [],
    });
    expect(selected.map((item) => String(item._id))).toEqual(
      ids.slice(0, 2).map(String),
    );
  });
});
