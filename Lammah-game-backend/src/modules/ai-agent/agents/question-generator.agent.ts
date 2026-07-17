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
      `${input.prompt}\nThis is a fast party game: write each question as one direct, conversational sentence readable aloud in under 6 seconds. Start with the question, not background. Keep explanation separate. Difficulty comes from the fact, never sentence complexity. Additionally return concise semantic entities for every question. Never return providers, URLs, or sentence-style search queries. Music modes supported: identifySong, identifySinger, identifyMusicIntro; music entities require title and artist.`,
      context.modelConfig?.temperature,
    );
  }
}
