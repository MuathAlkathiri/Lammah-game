import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';
import { AdminAiGeneratorController } from './admin-ai-generator.controller';
import { KnowledgeLoaderService } from './services/knowledge-loader.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { GameplayValidatorService } from './services/gameplay-validator.service';
import { WrongAnswerRepairService } from './services/wrong-answer-repair.service';
import { QuestionWordingService } from './services/question-wording.service';
import { LlmClientService } from './infrastructure/ai/llm-client.service';
import { ContentOrchestratorService } from './application/content-orchestrator.service';
import { QuestionGeneratorAgent } from './agents/question-generator.agent';
import { AssetPlannerAgent } from './agents/asset-planner.agent';
import { AssetReviewerAgent } from './agents/asset-reviewer.agent';
import { QuestionReviewerAgent } from './agents/question-reviewer.agent';
import { AppleMusicPreviewProvider } from './infrastructure/assets/apple-music-preview.provider';
import { CategoriesModule } from '../categories/categories.module';
import { MusicModule } from '../music/music.module';
import { QuestionsModule } from '../questions/questions.module';
import { AssetResolutionModule } from './asset-resolution.module';
import { ENTITY_RESEARCH_PROVIDER } from './contracts/entity-research-provider.interface';
import { EntityVerificationService } from './application/entity-verification.service';
import { WigoloClient } from './infrastructure/wigolo/wigolo-client';
import { WigoloResearchProvider } from './infrastructure/wigolo/wigolo-research.provider';
import { WigoloCacheRepository } from './infrastructure/wigolo/wigolo-cache.repository';

@Module({
  imports: [
    CategoriesModule,
    MusicModule,
    QuestionsModule,
    AssetResolutionModule,
  ],
  providers: [
    AiAgentService,
    KnowledgeLoaderService,
    PromptBuilderService,
    GameplayValidatorService,
    WrongAnswerRepairService,
    QuestionWordingService,
    LlmClientService,
    ContentOrchestratorService,
    QuestionGeneratorAgent,
    AssetPlannerAgent,
    AssetReviewerAgent,
    QuestionReviewerAgent,
    AppleMusicPreviewProvider,
    EntityVerificationService,
    WigoloClient,
    WigoloResearchProvider,
    WigoloCacheRepository,
    { provide: ENTITY_RESEARCH_PROVIDER, useExisting: WigoloResearchProvider },
  ],
  controllers: [AiAgentController, AdminAiGeneratorController],
  exports: [AiAgentService],
})
export class AiAgentModule {}
