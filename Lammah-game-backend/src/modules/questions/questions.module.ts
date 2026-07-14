import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuestionsService } from './questions.service';
import {
  AdminQuestionsController,
  QuestionsController,
} from './questions.controller';
import { CategoriesModule } from '../categories/categories.module';
import { AssetResolutionModule } from '../ai-agent/asset-resolution.module';
import { QuestionRepository } from './persistence/question.repository';
import { QueryQuestionsService } from './application/query-questions.service';
import { MutateQuestionService } from './application/mutate-question.service';
import { ReviewQuestionService } from './application/review-question.service';
import { QuestionAssetRetryService } from './application/question-asset-retry.service';
import { QuestionLifecyclePolicy } from './policies/question-lifecycle.policy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
    CategoriesModule,
    AssetResolutionModule,
  ],
  providers: [
    QuestionRepository,
    QuestionsService,
    QueryQuestionsService,
    MutateQuestionService,
    ReviewQuestionService,
    QuestionAssetRetryService,
    QuestionLifecyclePolicy,
  ],
  controllers: [QuestionsController, AdminQuestionsController],
  exports: [QuestionsService, QuestionRepository],
})
export class QuestionsModule {}
