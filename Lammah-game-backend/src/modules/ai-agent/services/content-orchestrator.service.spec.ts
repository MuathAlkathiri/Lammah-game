import { ContentOrchestratorService } from '../application/content-orchestrator.service';

describe('ContentOrchestratorService', () => {
  it('executes agents in order and keeps optional wrong answers', async () => {
    const calls: string[] = [];
    const agent = (name: string, value: unknown) => ({
      name,
      execute: async () => {
        calls.push(name);
        return value;
      },
    });
    const generator = agent('QuestionGeneratorAgent', {
      questions: [
        {
          question: 'سؤال واضح للاختبار',
          correctAnswer: 'إجابة',
          gameMode: 'trivia',
          wrongAnswers: [],
        },
      ],
    });
    const planner = agent('AssetPlannerAgent', {
      primaryAssetPlan: null,
      coverImagePlan: { entity: 'Naruto', assetType: 'image' },
    });
    const assetReviewer = agent('AssetReviewerAgent', {
      accepted: true,
      confidence: 0.9,
      issues: [],
      reason: 'relevant',
    });
    const reviewer = agent('QuestionReviewerAgent', {
      approvedForAdminReview: true,
      qualityScore: 8,
      issues: [],
      suggestedFixes: [],
    });
    const assets = {
      process: async (request?: unknown) =>
        request
          ? { assetStatus: 'FAILED', assetFailureReason: 'mock' }
          : { assetStatus: 'NOT_REQUIRED' },
    };
    const service = new ContentOrchestratorService(
      generator as unknown as ConstructorParameters<
        typeof ContentOrchestratorService
      >[0],
      planner as unknown as ConstructorParameters<
        typeof ContentOrchestratorService
      >[1],
      assets as unknown as ConstructorParameters<
        typeof ContentOrchestratorService
      >[2],
      assetReviewer as unknown as ConstructorParameters<
        typeof ContentOrchestratorService
      >[3],
      reviewer as unknown as ConstructorParameters<
        typeof ContentOrchestratorService
      >[4],
      {} as ConstructorParameters<typeof ContentOrchestratorService>[5],
    );
    const result = await service.execute('prompt', { language: 'ar' });
    expect(calls).toEqual([
      'QuestionGeneratorAgent',
      'AssetPlannerAgent',
      'AssetReviewerAgent',
      'QuestionReviewerAgent',
    ]);
    expect(
      (result.questions[0] as Record<string, unknown>).wrongAnswers,
    ).toEqual([]);
    expect(result.questions[0].agentTrace).toHaveLength(4);
  });
});
