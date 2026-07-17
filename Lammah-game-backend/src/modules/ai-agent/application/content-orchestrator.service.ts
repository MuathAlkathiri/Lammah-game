import { Injectable } from '@nestjs/common';
import {
  AgentExecutionContext,
  AgentTrace,
} from '../agents/llm-agent.interface';
import { QuestionGeneratorAgent } from '../agents/question-generator.agent';
import { AssetPlannerAgent } from '../agents/asset-planner.agent';
import { AssetReviewerAgent } from '../agents/asset-reviewer.agent';
import { QuestionReviewerAgent } from '../agents/question-reviewer.agent';
import { AssetService } from './asset.service';
import { AppleMusicPreviewProvider } from '../infrastructure/assets/apple-music-preview.provider';
import { MusicAssetPlan } from '../contracts/music-asset-provider.interface';
import { AssetRequest } from '../contracts/asset-provider.interface';
import { normalizeAssetRequestIntent } from './asset-request-normalizer';

@Injectable()
export class ContentOrchestratorService {
  constructor(
    private readonly generator: QuestionGeneratorAgent,
    private readonly planner: AssetPlannerAgent,
    private readonly assets: AssetService,
    private readonly assetReviewer: AssetReviewerAgent,
    private readonly questionReviewer: QuestionReviewerAgent,
    private readonly music: AppleMusicPreviewProvider,
  ) {}

  async execute(prompt: string, context: AgentExecutionContext) {
    const generated = await this.timed(this.generator.name, () =>
      this.generator.execute({ prompt }, context),
    );
    if (!generated.value)
      throw new Error(generated.trace.reason ?? 'Question generator failed');
    const questions = await Promise.all(
      (generated.value.questions ?? []).map(async (draft) => {
        const trace: AgentTrace[] = [generated.trace];
        const planned = await this.timed(this.planner.name, () =>
          this.planner.execute(draft, context),
        );
        trace.push(planned.trace);
        if (!planned.value)
          return {
            ...draft,
            issues: [...this.array(draft.issues), 'AssetPlannerAgent failed'],
            agentTrace: trace,
          };

        const primaryPlan = planned.value.primaryAssetPlan;
        const coverPlan = planned.value.coverImagePlan;
        const primaryRequest = primaryPlan
          ? this.planToRequest(
              primaryPlan,
              draft.gameMode as AssetRequest['gameMode'],
            )
          : null;
        const primaryResult = await this.resolvePrimary(
          primaryPlan,
          draft.gameMode as AssetRequest['gameMode'],
        );
        const coverResult = await this.assets.process(
          coverPlan ? this.imageCoverRequest(coverPlan) : undefined,
        );
        const assetReview = await this.timed(this.assetReviewer.name, () =>
          this.assetReviewer.execute(
            {
              question: draft.question,
              correctAnswer: draft.correctAnswer,
              gameMode: draft.gameMode,
              requestedEntity:
                primaryPlan?.canonicalEntity ??
                primaryPlan?.entity ??
                primaryPlan?.title,
              retrievedAssetMetadata:
                primaryResult.assetStatus === 'READY'
                  ? primaryResult.asset
                  : null,
              providerSearchResult: primaryResult,
            },
            context,
          ),
        );
        trace.push(assetReview.trace);
        const assembled = {
          ...draft,
          primaryAssetRequest: primaryPlan ? primaryRequest : null,
          assetRequest: primaryRequest,
          primaryAssetStatus: primaryResult.assetStatus,
          assetStatus: primaryResult.assetStatus,
          primaryAsset:
            primaryResult.assetStatus === 'READY' ? primaryResult.asset : null,
          asset:
            primaryResult.assetStatus === 'READY' ? primaryResult.asset : null,
          assetFailureReason:
            primaryResult.assetStatus === 'FAILED'
              ? primaryResult.assetFailureReason
              : undefined,
          coverImageRequest: coverPlan
            ? { ...coverPlan, type: 'image', purpose: 'decorative' }
            : null,
          coverImageStatus:
            coverResult.assetStatus === 'NOT_REQUIRED'
              ? 'FAILED'
              : coverResult.assetStatus,
          coverImage:
            coverResult.assetStatus === 'READY' ? coverResult.asset : null,
          coverImageFailureReason:
            coverResult.assetStatus === 'FAILED'
              ? coverResult.assetFailureReason
              : undefined,
          assetPlannerDiagnostics: planned.value.plannerDiagnostics,
          issues: [
            ...this.array(draft.issues),
            ...(assetReview.value?.issues ?? []),
            ...(assetReview.value && !assetReview.value.accepted
              ? [`Asset rejected: ${assetReview.value.reason}`]
              : []),
          ],
        };
        const review = await this.timed(this.questionReviewer.name, () =>
          this.questionReviewer.execute(assembled, context),
        );
        trace.push(review.trace);
        return {
          ...assembled,
          qualityScore: review.value?.qualityScore ?? draft.qualityScore,
          issues: [...assembled.issues, ...(review.value?.issues ?? [])],
          approvedForAdminReview: review.value?.approvedForAdminReview ?? false,
          agentTrace: trace,
        };
      }),
    );
    return { questions };
  }

  private async resolvePrimary(
    plan: Record<string, unknown> | null,
    gameMode: AssetRequest['gameMode'],
  ) {
    if (!plan) return this.assets.process();
    if (plan.assetType === 'musicPreview') {
      const results = await this.music.searchTrack(
        plan as unknown as MusicAssetPlan,
      );
      for (const result of results) {
        const preview = await this.music.resolvePreview(result);
        if (preview)
          return {
            assetStatus: 'READY' as const,
            asset: { ...preview, localPath: '', provider: this.music.name },
          };
      }
      return {
        assetStatus: 'FAILED' as const,
        assetFailureReason: 'No verified official preview found',
        assetFailureStep: 'music-preview-verification',
      };
    }
    return this.assets.process(this.planToRequest(plan, gameMode));
  }

  private planToRequest(
    plan: Record<string, unknown>,
    gameMode?: AssetRequest['gameMode'],
  ): AssetRequest {
    const request = {
      ...plan,
      type: plan.assetType === 'image' ? 'image' : 'audio',
    } as AssetRequest;
    return gameMode ? normalizeAssetRequestIntent(request, gameMode) : request;
  }
  private imageCoverRequest(plan: Record<string, unknown>): AssetRequest {
    return { ...plan, type: 'image', purpose: 'decorative' } as AssetRequest;
  }
  private array(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
  private async timed<T>(
    agent: string,
    operation: () => Promise<T>,
  ): Promise<{ value?: T; trace: AgentTrace }> {
    const started = Date.now();
    try {
      return {
        value: await operation(),
        trace: { agent, status: 'completed', durationMs: Date.now() - started },
      };
    } catch (error) {
      return {
        trace: {
          agent,
          status: 'failed',
          durationMs: Date.now() - started,
          reason: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
