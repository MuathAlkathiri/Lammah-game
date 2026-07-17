# AI generation architecture

Lammah’s reviewed AI generator is moving toward a configuration-driven pipeline:

```text
Generation request
→ category profile resolution
→ global question policy
→ reusable question pattern
→ structured draft parsing/normalization
→ deterministic pre-verification validation
→ bounded repair/quality tagging
→ Wigolo entity verification
→ asset planning/provider search
→ reviewed draft
```

The core orchestrator should coordinate stages. It should not learn every category’s trivia rules.

## Separation of responsibilities

- Global policy: universal quality rules such as one objective answer, no vague/generic answers, no answer leakage, natural Arabic wording, and no unsupported claims.
- Category profile: what this category allows: entity types, patterns, assets, forbidden answer classes, required fields, locale behavior, and verification policy.
- Question pattern: reusable semantic shape such as `identifyCharacter`, `identifySong`, `identifyLocation`, `identifyWeapon`, `timelineEvent`, or `textTrivia`.
- Knowledge content: factual category/domain material the model may use.

Do not collapse these into one giant markdown prompt.

## Adding a normal category

1. Choose a stable category key.
2. Add or update one validated `CategoryGenerationProfile`.
3. Reuse existing pattern IDs when possible.
4. Define allowed entity types and required canonical fields.
5. Add or link knowledge content only for factual grounding.
6. Add profile contract tests.
7. Run profile integrity validation.
8. Do not edit the main orchestrator unless adding a genuinely reusable framework capability.

## When custom code is justified

Use a custom rule or strategy only when a reusable pattern/profile cannot express the requirement safely. Examples:

- verified Gulf music pool selection
- category-specific canonical alias normalization
- specialized entity candidate planning

Custom logic should be registered by rule/strategy ID and referenced from profiles. Do not put provider calls or category-specific branches inside the main orchestration flow.

## Anti-patterns

- Adding `if category === ...` chains for every new category.
- Letting the LLM return only `question` and `correctAnswer` for entity-backed questions.
- Sending vague entities like `Political Alliances`, `Power`, or `Adventure` to Wigolo.
- Searching providers before verification permits it.
- Exposing raw prompts, raw MCP payloads, local paths, or provider internals to the frontend.

## Current built-in profiles

- `general-text-trivia`
- `gulf-music`
- `anime`
- `video-games`
- `from-series`

Video-games is the first broad category profile proving the architecture. It rejects generic/abstract answers and requires concrete game context such as `gameTitle` for game-specific entities.
