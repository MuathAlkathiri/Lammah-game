import { Injectable } from '@nestjs/common';
import { LlmClientService } from '../infrastructure/ai/llm-client.service';
import { AgentExecutionContext, LlmAgent } from './llm-agent.interface';
export type QuestionReview = {
  approvedForAdminReview: boolean;
  qualityScore: number;
  issues: string[];
  suggestedFixes: string[];
};
@Injectable()
export class QuestionReviewerAgent implements LlmAgent<
  Record<string, unknown>,
  QuestionReview
> {
  readonly name = 'QuestionReviewerAgent';
  constructor(private readonly llm: LlmClientService) {}
  execute(input: Record<string, unknown>, context: AgentExecutionContext) {
    return this.llm.completeJson<QuestionReview>(
      `Review this completed Arabic party-game draft. Score factual correctness, answer uniqueness, difficulty fit, mode consistency, metadata, leakage, wrong-answer plausibility, clarity, conciseness, fun/directness, and game readability as separate concerns. A factually correct question must not score near-perfect if it feels like an exam, contains explanation, asks two things, or takes more than about 6 seconds to read. Hardness must come from knowledge rather than complex wording. Suggest repair but never rewrite facts, publish, or save. Draft: ${JSON.stringify(input)}`,
      context.modelConfig?.temperature ?? 0.1,
    );
  }
}
