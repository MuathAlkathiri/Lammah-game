import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService reviewed difficulty guidance', () => {
  const builder = new PromptBuilderService();
  const build = (difficulty: 'easy' | 'medium' | 'hard') =>
    builder.buildReviewedQuestionsPrompt({
      catalogName: 'Movies',
      categoryName: 'Marvel',
      difficulty,
      count: 2,
      language: 'ar',
      knowledgeFile: 'default.md',
      usedDefaultKnowledge: true,
      knowledge: { raw: 'Facts', sections: {} },
    });

  it.each([
    ['easy', 'widely recognizable answer'],
    ['medium', 'reasonable subject knowledge'],
    ['hard', 'deeper or more specific subject knowledge'],
  ] as const)('adds behavioral guidance for %s', (difficulty, expected) => {
    expect(build(difficulty)).toContain(expected);
    expect(build(difficulty)).toContain('Required count: 2');
  });

  it('locks Gulf music generation to grounded song identification', () => {
    const prompt = builder.buildReviewedQuestionsPrompt({
      catalogName: 'Music',
      categoryName: 'أغاني الخليج',
      difficulty: 'easy',
      count: 2,
      language: 'ar',
      knowledgeFile: 'music/gulf-music.md',
      usedDefaultKnowledge: false,
      knowledge: { raw: 'verified songs', sections: {} },
    });
    expect(prompt).toContain(
      'Every question field must be exactly: "ما اسم هذه الأغنية؟"',
    );
    expect(prompt).toContain('gameMode="identifySong"');
    expect(prompt).toContain(
      'Never create a song or artist outside the verified table',
    );
  });
});
