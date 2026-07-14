import { Injectable } from '@nestjs/common';
import { LlmClientService } from '../infrastructure/ai/llm-client.service';
import { AgentExecutionContext, LlmAgent } from './llm-agent.interface';

export type AssetPlans = {
  primaryAssetPlan: Record<string, unknown> | null;
  coverImagePlan: Record<string, unknown>;
};
@Injectable()
export class AssetPlannerAgent implements LlmAgent<
  Record<string, unknown>,
  AssetPlans
> {
  readonly name = 'AssetPlannerAgent';
  constructor(private readonly llm: LlmClientService) {}
  execute(input: Record<string, unknown>, context: AgentExecutionContext) {
    return this.llm.completeJson<AssetPlans>(
      `Convert this draft's entities into concise structured asset plans. Do not retrieve files, choose providers, invent URLs, or write prose. Decorative covers must not reveal the answer. Draft: ${JSON.stringify(input)}`,
      context.modelConfig?.temperature ?? 0.2,
    );
  }
}
