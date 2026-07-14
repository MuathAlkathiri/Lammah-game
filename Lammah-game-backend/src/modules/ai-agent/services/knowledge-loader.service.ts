import { Injectable } from '@nestjs/common';
import { access, readFile } from 'fs/promises';
import { constants } from 'fs';
import { join, normalize } from 'path';
import {
  ParsedKnowledge,
  parseKnowledgeMarkdown,
} from '../utils/markdown-parser';

export type LoadedKnowledge = {
  requestedFile: string;
  knowledgeFile: string;
  usedDefaultKnowledge: boolean;
  knowledge: ParsedKnowledge;
};

@Injectable()
export class KnowledgeLoaderService {
  private readonly cache = new Map<string, ParsedKnowledge>();
  private readonly defaultKnowledgeFile = 'default.md';

  async load(knowledgeFile?: string | null): Promise<LoadedKnowledge> {
    const requestedFile = this.normalizeKnowledgeFile(
      knowledgeFile || this.defaultKnowledgeFile,
    );
    const resolvedFile = (await this.exists(requestedFile))
      ? requestedFile
      : this.defaultKnowledgeFile;
    const usedDefaultKnowledge = resolvedFile === this.defaultKnowledgeFile;

    return {
      requestedFile,
      knowledgeFile: resolvedFile,
      usedDefaultKnowledge,
      knowledge: await this.loadParsed(resolvedFile),
    };
  }

  inferKnowledgeFile(catalogName: string, categoryName: string): string {
    return `${this.slugify(catalogName)}/${this.slugify(categoryName)}.md`;
  }

  private async loadParsed(knowledgeFile: string): Promise<ParsedKnowledge> {
    const cacheKey = knowledgeFile.toLowerCase();
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const markdown = await readFile(this.toAbsolutePath(knowledgeFile), 'utf8');
    const parsed = parseKnowledgeMarkdown(markdown);
    this.cache.set(cacheKey, parsed);
    return parsed;
  }

  private async exists(knowledgeFile: string): Promise<boolean> {
    try {
      await access(this.toAbsolutePath(knowledgeFile), constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private toAbsolutePath(knowledgeFile: string): string {
    return join(__dirname, '..', 'knowledge', knowledgeFile);
  }

  private normalizeKnowledgeFile(knowledgeFile: string): string {
    const normalizedFile = normalize(knowledgeFile.trim())
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/^[/\\]+/, '');

    return normalizedFile.endsWith('.md')
      ? normalizedFile
      : `${normalizedFile}.md`;
  }

  private slugify(value: string): string {
    return (
      value
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '') || 'default'
    );
  }
}
