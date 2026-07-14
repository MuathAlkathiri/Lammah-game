import { Injectable } from '@nestjs/common';
import { LlmClientService } from '../infrastructure/ai/llm-client.service';
import { AgentExecutionContext, LlmAgent } from './llm-agent.interface';

@Injectable()
export class QuestionGeneratorAgent implements LlmAgent<
  { prompt: string },
  { questions: Record<string, unknown>[] }
> {
  readonly name = 'QuestionGeneratorAgent';
  constructor(private readonly llm: LlmClientService) {}
  execute(input: { prompt: string }, context: AgentExecutionContext) {
    return this.llm.completeJson<{ questions: Record<string, unknown>[] }>(
      `${input.prompt}\nAdditionally return concise semantic entities for every question. Never return providers, URLs, or sentence-style search queries. Music modes supported: identifySong, identifySinger, identifyMusicIntro; music entities require title and artist.`,
      context.modelConfig?.temperature,
    );
  }
}
