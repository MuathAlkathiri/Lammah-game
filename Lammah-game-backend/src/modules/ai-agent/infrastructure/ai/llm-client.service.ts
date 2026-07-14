import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmClientService {
  constructor(private readonly config: ConfigService) {}

  async complete(prompt: string, temperature?: number): Promise<string> {
    const provider = (
      this.config.get<string>('AI_PROVIDER') ?? 'openrouter'
    ).toLowerCase();
    const isOpenRouter = provider === 'openrouter';
    const base = isOpenRouter
      ? 'https://openrouter.ai/api/v1'
      : (
          this.config.get<string>('LM_STUDIO_BASE_URL') ??
          'http://localhost:1234/v1'
        ).replace(/\/+$/, '');
    const key = isOpenRouter
      ? this.config.get<string>('OPENROUTER_API_KEY')
      : (this.config.get<string>('LM_STUDIO_API_KEY') ?? 'lm-studio');
    const model = isOpenRouter
      ? (this.config.get<string>('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini')
      : (this.config.get<string>('LM_STUDIO_MODEL') ?? 'local-model');
    if (isOpenRouter && !key) throw new Error('OPENROUTER_API_KEY is required');
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(
        Number(this.config.get('AI_REQUEST_TIMEOUT_MS')) || 120_000,
      ),
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature ?? 0.7,
        max_tokens: 4096,
      }),
    });
    if (!response.ok)
      throw new Error(`LLM request failed with HTTP ${response.status}`);
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM returned empty content');
    return content;
  }

  async completeJson<T>(prompt: string, temperature?: number): Promise<T> {
    const content = await this.complete(
      `${prompt}\nReturn JSON only.`,
      temperature,
    );
    return JSON.parse(
      content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''),
    ) as T;
  }
}
