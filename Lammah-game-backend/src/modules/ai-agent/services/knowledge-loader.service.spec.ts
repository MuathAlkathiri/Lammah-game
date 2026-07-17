import { KnowledgeLoaderService } from './knowledge-loader.service';

describe('KnowledgeLoaderService', () => {
  const service = new KnowledgeLoaderService();

  it('routes the Arabic songs category to the verified Gulf music knowledge file', () => {
    expect(service.inferKnowledgeFile('أي كتالوج', 'اغاني')).toBe(
      'music/gulf-music.md',
    );
  });

  it('loads Gulf music knowledge for the Arabic songs category without falling back to default', async () => {
    const loaded = await service.load(
      service.inferKnowledgeFile('عام', 'اغاني'),
    );

    expect(loaded.knowledgeFile).toBe('music/gulf-music.md');
    expect(loaded.usedDefaultKnowledge).toBe(false);
    expect(loaded.knowledge.raw).toContain('ما اسم هذه الأغنية؟');
  });

  it('routes the FROM category to the dedicated series knowledge file', () => {
    expect(service.inferKnowledgeFile('مسلسلات', 'from')).toBe(
      'series/from.md',
    );
  });

  it.each([
    ['ألعاب', 'عام'],
    ['العاب', 'عام'],
    ['عام', 'ألعاب الفيديو'],
    ['Video Games', 'General'],
    ['General', 'Gaming'],
  ])(
    'routes video-games category %s / %s to the stronger games knowledge file',
    (catalogName, categoryName) => {
      expect(service.inferKnowledgeFile(catalogName, categoryName)).toBe(
        'games/video-games.md',
      );
    },
  );

  it('loads FROM knowledge without falling back to default', async () => {
    const loaded = await service.load(
      service.inferKnowledgeFile('مسلسلات', 'from'),
    );

    expect(loaded.knowledgeFile).toBe('series/from.md');
    expect(loaded.usedDefaultKnowledge).toBe(false);
    expect(loaded.knowledge.raw).toContain('Boyd Stevens');
    expect(loaded.knowledge.raw).toContain('بويد ستيفنز (Boyd Stevens)');
    expect(loaded.knowledge.raw).toContain(
      'do not output English-only answers',
    );
    expect(loaded.knowledge.raw).toContain('Do not use `identifyVoice`');
  });

  it('loads video-games knowledge without falling back to default', async () => {
    const loaded = await service.load(
      service.inferKnowledgeFile('ألعاب', 'عام'),
    );

    expect(loaded.knowledgeFile).toBe('games/video-games.md');
    expect(loaded.usedDefaultKnowledge).toBe(false);
    expect(loaded.knowledge.raw).toContain(
      'Make video-game questions stronger',
    );
    expect(loaded.knowledge.raw).toContain('وش السلاح الأيقوني');
    expect(loaded.knowledge.raw).toContain(
      'Do not output English-only answers',
    );
  });
});
