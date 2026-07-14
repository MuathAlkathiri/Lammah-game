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
      `Review this completed Arabic party-game draft. Check clarity, difficulty, mode consistency, verified metadata, leakage, and optional wrong-answer plausibility. Do not publish or save it. Draft: ${JSON.stringify(input)}`,
      context.modelConfig?.temperature ?? 0.1,
    );
  }
}
