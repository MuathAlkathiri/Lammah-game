import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Game,
  GameStatus,
  CategoryBoard,
  QuestionInGame,
  QuestionSelectionMode,
} from './schemas/game.schema';
import {
  Question,
  QuestionPoints,
  QuestionStatus,
} from '../questions/schemas/question.schema';
import { CreateGameDto, RevealAnswerDto, AwardPointsDto, SkipQuestionDto } from './dto/create-game.dto';
import { CategoriesService } from '../categories/categories.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole, SubscriptionStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { QuestionHistoryService } from '../question-history/question-history.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name) private gameModel: Model<Game>,
    @InjectModel(Question.name) private questionModel: Model<Question>,
    private categoriesService: CategoriesService,
    private usersService: UsersService,
    private questionHistoryService: QuestionHistoryService,
  ) {}

  async create(createGameDto: CreateGameDto, user: AuthenticatedUser): Promise<Game> {
    const { name, teams, categoryIds } = createGameDto;
    const owner = await this.usersService.findById(user.id);
    const isFreeGame = owner.freeGamesUsed === 0;

    // Validate exactly 2 teams
    if (teams.length !== 2) {
      throw new BadRequestException('Exactly 2 teams are required');
    }

    // Validate at least 1 category
    if (categoryIds.length === 0) {
      throw new BadRequestException('At least 1 category is required');
    }

    // Verify all categories exist
    for (const categoryId of categoryIds) {
      await this.categoriesService.findById(categoryId);
    }

    if (!isFreeGame && !this.hasActiveSubscription(owner)) {
      throw new ForbiddenException(
        'You need an active subscription to create more games.',
      );
    }

    const questionSelectionMode = isFreeGame
      ? QuestionSelectionMode.FIXED
      : QuestionSelectionMode.RANDOM;
    const seenQuestionIds = isFreeGame
      ? []
      : await this.questionHistoryService.findSeenQuestionIds(owner._id);

    // Build the game board
    const board: CategoryBoard[] = [];

    for (const categoryId of categoryIds) {
      const questions200 = await this.selectQuestionsForCategoryAndPoints({
        categoryId,
        points: QuestionPoints.LOW,
        isFreeGame,
        seenQuestionIds,
      });

      const questions400 = await this.selectQuestionsForCategoryAndPoints({
        categoryId,
        points: QuestionPoints.MEDIUM,
        isFreeGame,
        seenQuestionIds,
      });

      const questions600 = await this.selectQuestionsForCategoryAndPoints({
        categoryId,
        points: QuestionPoints.HIGH,
        isFreeGame,
        seenQuestionIds,
      });

      // Validate we have exactly 2 questions for each point value
      if (
        questions200.length !== 2 ||
        questions400.length !== 2 ||
        questions600.length !== 2
      ) {
        throw new BadRequestException(
          `Category with ID "${categoryId}" does not have exactly 2 approved questions for each point value (200, 400, 600). ` +
          `Found: 200pts=${questions200.length}, 400pts=${questions400.length}, 600pts=${questions600.length}`,
        );
      }

      // Build questions for this category
      const categoryQuestions: QuestionInGame[] = [
        ...questions200.map((q) => ({
          question: q._id,
          points: 200 as const,
          isAnswered: false,
          isAnswerRevealed: false,
        })),
        ...questions400.map((q) => ({
          question: q._id,
          points: 400 as const,
          isAnswered: false,
          isAnswerRevealed: false,
        })),
        ...questions600.map((q) => ({
          question: q._id,
          points: 600 as const,
          isAnswered: false,
          isAnswerRevealed: false,
        })),
      ];

      board.push({
        category: new Types.ObjectId(categoryId),
        questions: categoryQuestions,
      });
    }

    // Create the game
    const game = await this.gameModel.create({
      name,
      owner: owner._id,
      isFreeGame,
      questionSelectionMode,
      teams: teams.map((t) => ({
        name: t.name,
        members: t.members || [],
        score: 0,
      })),
      selectedCategories: categoryIds.map((id) => new Types.ObjectId(id)),
      board,
      status: GameStatus.ACTIVE,
      currentTurnTeamIndex: 0,
    });

    await this.questionHistoryService.recordQuestions(
      owner._id,
      game._id,
      board.flatMap((categoryBoard) =>
        categoryBoard.questions.map((questionInGame) => ({
          category: categoryBoard.category,
          question: questionInGame.question,
        })),
      ),
    );

    if (isFreeGame) {
      await this.usersService.incrementFreeGamesUsed(owner._id);
    }

    return game.populate([
      { path: 'owner', select: '-password' },
      { path: 'selectedCategories' },
      {
        path: 'board.category',
      },
      {
        path: 'board.questions.question',
        select: '-answer', // Hide the answer by default
      },
    ]);
  }

  async findAll(user: AuthenticatedUser): Promise<Game[]> {
    const filter =
      user.role === UserRole.ADMIN ? {} : { owner: new Types.ObjectId(user.id) };

    return this.gameModel
      .find(filter)
      .populate([
        { path: 'owner', select: '-password' },
        { path: 'selectedCategories' },
        { path: 'board.category' },
        {
          path: 'board.questions.question',
          select: '-answer', // Hide the answer by default
        },
      ])
      .exec();
  }

  async findById(id: string, user: AuthenticatedUser): Promise<Game> {
    const game = await this.gameModel
      .findById(id)
      .populate([
        { path: 'owner', select: '-password' },
        { path: 'selectedCategories' },
        { path: 'board.category' },
        {
          path: 'board.questions.question',
          select: '-answer', // Hide the answer by default
        },
      ])
      .exec();

    if (!game) {
      throw new NotFoundException(`Game with ID "${id}" not found`);
    }

    this.ensureCanAccessGame(game, user);

    return game;
  }

  async revealAnswer(id: string, revealAnswerDto: RevealAnswerDto, user: AuthenticatedUser): Promise<Game> {
    const game = await this.gameModel.findById(id);

    if (!game) {
      throw new NotFoundException(`Game with ID "${id}" not found`);
    }

    this.ensureCanAccessGame(game, user);

    const questionId = new Types.ObjectId(revealAnswerDto.questionId);
    let found = false;

    // Find and update the question
    for (const categoryBoard of game.board) {
      for (const questionInGame of categoryBoard.questions) {
        if (questionInGame.question.equals(questionId)) {
          questionInGame.isAnswerRevealed = true;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new BadRequestException(
        'Question not found in this game board',
      );
    }

    game.updatedAt = new Date();
    await game.save();

    return game.populate([
      { path: 'owner', select: '-password' },
      { path: 'selectedCategories' },
      { path: 'board.category' },
      { path: 'board.questions.question' }, // Show the answer when revealed
    ]);
  }

  async awardPoints(id: string, awardPointsDto: AwardPointsDto, teamIndex: number, user: AuthenticatedUser): Promise<Game> {
    if (teamIndex !== 0 && teamIndex !== 1) {
      throw new BadRequestException('Team index must be 0 or 1');
    }

    const game = await this.gameModel.findById(id);

    if (!game) {
      throw new NotFoundException(`Game with ID "${id}" not found`);
    }

    this.ensureCanAccessGame(game, user);

    const questionId = new Types.ObjectId(awardPointsDto.questionId);
    let found = false;
    let points = 0;

    // Find and update the question
    for (const categoryBoard of game.board) {
      for (const questionInGame of categoryBoard.questions) {
        if (questionInGame.question.equals(questionId)) {
          if (questionInGame.isAnswered) {
            throw new BadRequestException('Question is already answered');
          }

          questionInGame.isAnswered = true;
          questionInGame.isAnswerRevealed = true;
          questionInGame.answeredByTeamIndex = teamIndex;
          questionInGame.awardedPoints = questionInGame.points;
          points = questionInGame.points;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new BadRequestException('Question not found in this game board');
    }

    // Award points to the team
    game.teams[teamIndex].score += points;

    // Switch turn
    game.currentTurnTeamIndex = game.currentTurnTeamIndex === 0 ? 1 : 0;

    // Check if all questions are answered
    if (this.areAllQuestionsAnswered(game)) {
      game.status = GameStatus.FINISHED;
      game.finishedAt = new Date();
    }

    game.updatedAt = new Date();
    await game.save();

    return game.populate([
      { path: 'owner', select: '-password' },
      { path: 'selectedCategories' },
      { path: 'board.category' },
      { path: 'board.questions.question' },
    ]);
  }

  async skipQuestion(id: string, skipQuestionDto: SkipQuestionDto, user: AuthenticatedUser): Promise<Game> {
    const game = await this.gameModel.findById(id);

    if (!game) {
      throw new NotFoundException(`Game with ID "${id}" not found`);
    }

    this.ensureCanAccessGame(game, user);

    const questionId = new Types.ObjectId(skipQuestionDto.questionId);
    let found = false;

    // Find and update the question
    for (const categoryBoard of game.board) {
      for (const questionInGame of categoryBoard.questions) {
        if (questionInGame.question.equals(questionId)) {
          if (questionInGame.isAnswered) {
            throw new BadRequestException('Question is already answered');
          }

          questionInGame.isAnswered = true;
          questionInGame.isAnswerRevealed = true;
          questionInGame.awardedPoints = 0;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new BadRequestException('Question not found in this game board');
    }

    // Switch turn
    game.currentTurnTeamIndex = game.currentTurnTeamIndex === 0 ? 1 : 0;

    // Check if all questions are answered
    if (this.areAllQuestionsAnswered(game)) {
      game.status = GameStatus.FINISHED;
      game.finishedAt = new Date();
    }

    game.updatedAt = new Date();
    await game.save();

    return game.populate([
      { path: 'owner', select: '-password' },
      { path: 'selectedCategories' },
      { path: 'board.category' },
      { path: 'board.questions.question' },
    ]);
  }

  private areAllQuestionsAnswered(game: Game): boolean {
    for (const categoryBoard of game.board) {
      for (const questionInGame of categoryBoard.questions) {
        if (!questionInGame.isAnswered) {
          return false;
        }
      }
    }
    return true;
  }

  private async selectQuestionsForCategoryAndPoints(options: {
    categoryId: string;
    points: QuestionPoints;
    isFreeGame: boolean;
    seenQuestionIds: Types.ObjectId[];
  }): Promise<Question[]> {
    const baseFilter = {
      category: new Types.ObjectId(options.categoryId),
      points: options.points,
      status: QuestionStatus.APPROVED,
      ...(options.isFreeGame && { isFreeGameQuestion: true }),
    };

    const candidates = await this.questionModel
      .find(baseFilter)
      .sort(options.isFreeGame ? { createdAt: 1, _id: 1 } : {})
      .exec();

    if (options.isFreeGame) {
      return candidates.slice(0, 2);
    }

    const seenQuestionIds = new Set(
      options.seenQuestionIds.map((questionId) => questionId.toString()),
    );
    const unseenCandidates = candidates.filter(
      (question) => !seenQuestionIds.has(question._id.toString()),
    );

    // Prefer unseen questions, but fall back to seen ones when the category/tier
    // does not have enough new approved questions to build a valid board.
    const source =
      unseenCandidates.length >= 2 ? unseenCandidates : candidates;

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

  private hasActiveSubscription(user: {
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiresAt?: Date;
  }): boolean {
    if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    return (
      !user.subscriptionExpiresAt ||
      user.subscriptionExpiresAt.getTime() > Date.now()
    );
  }

  private ensureCanAccessGame(game: Game, user: AuthenticatedUser): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (game.owner.toString() !== user.id) {
      throw new ForbiddenException('You do not have access to this game');
    }
  }
}
