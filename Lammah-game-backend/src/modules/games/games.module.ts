import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from './schemas/game.schema';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { QuestionsModule } from '../questions/questions.module';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { QuestionHistoryModule } from '../question-history/question-history.module';
import { GameRepository } from './persistence/game.repository';
import { QuestionSelectorService } from './selectors/question-selector.service';
import { GameActionPolicy } from './policies/game-action.policy';
import { GameLifecyclePolicy } from './policies/game-lifecycle.policy';
import { ScoringPolicy } from './policies/scoring.policy';
import { CreateGameService } from './application/create-game.service';
import { QueryGameService } from './application/query-game.service';
import { GameProgressService } from './application/game-progress.service';
import { GameScoringService } from './application/game-scoring.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }]),
    CategoriesModule,
    UsersModule,
    QuestionHistoryModule,
    QuestionsModule,
  ],
  providers: [
    GameRepository,
    QuestionSelectorService,
    GameActionPolicy,
    GameLifecyclePolicy,
    ScoringPolicy,
    GamesService,
    CreateGameService,
    QueryGameService,
    GameProgressService,
    GameScoringService,
  ],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
