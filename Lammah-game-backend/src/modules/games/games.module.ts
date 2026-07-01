import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from './schemas/game.schema';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Question, QuestionSchema } from '../questions/schemas/question.schema';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { QuestionHistoryModule } from '../question-history/question-history.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
    CategoriesModule,
    UsersModule,
    QuestionHistoryModule,
  ],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
