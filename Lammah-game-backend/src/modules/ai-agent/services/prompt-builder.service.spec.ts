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
      categoryName: 'اغاني',
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
    expect(prompt).toContain('duration=15');
    expect(prompt).toContain(
      'Never create a song or artist outside the verified table',
    );
  });

  it('pushes the model toward human host-style Arabic instead of robotic riddles', () => {
    const prompt = build('medium');

    expect(prompt).toContain('Write like a human quiz host talking to friends');
    expect(prompt).toContain('Avoid robotic riddle phrasing');
    expect(prompt).toContain('Human Style Examples');
    expect(prompt).toContain('مين دايم يحرك الخيوط من وراء الستار؟');
    expect(prompt).toContain('وش الشيء اللي يحميهم من وحوش الليل؟');
  });

  it('requires Arabic-first player-facing answers while keeping English for metadata', () => {
    const prompt = build('medium');

    expect(prompt).toContain('player-facing answers must be Arabic-first');
    expect(prompt).toContain(
      'Arabic followed by the canonical English name in parentheses',
    );
    expect(prompt).toContain('Avoid English-only correctAnswer/wrongAnswers');
    expect(prompt).toContain(
      'Keep canonical English names/titles inside assetRequest metadata',
    );
    expect(prompt).toContain(
      '"correctAnswer": "الإجابة الصحيحة بالعربية أو بالعربية (English)"',
    );
  });
});
