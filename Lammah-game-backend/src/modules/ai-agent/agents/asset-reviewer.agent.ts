import { Injectable } from '@nestjs/common';
import { LlmClientService } from '../infrastructure/ai/llm-client.service';
import { AgentExecutionContext, LlmAgent } from './llm-agent.interface';
export type AssetReview = {
  accepted: boolean;
  confidence: number;
  issues: string[];
  reason: string;
};
@Injectable()
export class AssetReviewerAgent implements LlmAgent<
  Record<string, unknown>,
  AssetReview
> {
  readonly name = 'AssetReviewerAgent';
  constructor(private readonly llm: LlmClientService) {}
  execute(input: Record<string, unknown>, context: AgentExecutionContext) {
    return this.llm.completeJson<AssetReview>(
      `Review only the supplied asset metadata for entity/franchise relevance and answer leakage. Never claim audio-content recognition. Input: ${JSON.stringify(input)}`,
      context.modelConfig?.temperature ?? 0.1,
    );
  }
}
