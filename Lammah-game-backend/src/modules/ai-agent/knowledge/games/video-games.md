# Context

Use this file for broad video-games categories such as `ألعاب`, `العاب`, `Video Games`, `Games`, and `Gaming`.

The audience plays a fast social quiz. Questions should feel made by someone who actually plays games, not a generic AI summary.

---

# Core Rule

Make video-game questions stronger by asking about playable knowledge:

- mechanics
- abilities
- weapons/items
- maps/locations
- bosses/enemies
- objectives
- factions/classes
- iconic missions/scenes
- game modes
- recognizable UI/gameplay terms
- character roles only when the clue is specific to the game

Avoid weak generic prompts where the answer could be guessed from the category alone.

---

# Answer Language

- Player-facing answers must be Arabic-first.
- For proper nouns, use Arabic followed by canonical English in parentheses when useful.
- Keep English canonical titles/names in asset metadata for search and verification.
- Do not output English-only answers unless the term is normally used in English by Arab players.

Examples:

- `كريتوس (Kratos)`
- `سلاح الماستر سورد (Master Sword)`
- `جراند ثفت أوتو V (Grand Theft Auto V)`
- `كريبر (Creeper)`

---

# Strong Question Patterns

Prefer questions like:

- وش السلاح الأيقوني اللي يحمله لينك في أغلب ألعاب Zelda؟
- في Minecraft، وش الكائن اللي ينفجر إذا قرب منك؟
- أي لعبة اشتهرت ببناء الحصون وقت القتال؟
- في God of War، مين الإله اللي يحمل فأس ليفايثان؟
- وش اسم المدينة المفتوحة في GTA V؟
- في Elden Ring، وش العملة/المورد اللي تجمعه بدل الخبرة؟
- في Among Us، وش دور اللاعب اللي يحاول يخرب السفينة بدون ما ينكشف؟

The question should test one concrete game fact. One clue is enough.

---

# Weak Question Patterns to Avoid

Do not generate questions like:

- من هو بطل اللعبة؟
- ما اسم هذه اللعبة المشهورة؟
- من الشخصية التي تمتلك قوة كبيرة؟
- ما اللعبة التي يحبها اللاعبون؟
- ما العنصر المهم في هذه اللعبة؟
- أي لعبة تعتبر من أشهر الألعاب؟

These are too generic unless the question includes a specific mechanic, scene, item, map, or objective.

---

# Gameplay Mix

For broad video-games categories:

- Use mostly `trivia`, `identifyImage`, `identifyCharacter`, and `timeline`.
- Use `video` only for recognizable gameplay/action clips when metadata is specific.
- Do not use `identifyVoice` unless the clue is a famous voice line with reliable source metadata.
- Avoid music modes unless the category is explicitly game music.

---

# Good Asset Metadata

Use concise metadata that helps the provider search correctly.

## Character/image clue

```json
{
  "type": "image",
  "assetType": "image",
  "entity": "Kratos",
  "localizedName": "كريتوس",
  "franchise": "God of War",
  "entityType": "character",
  "categoryType": "games",
  "visualHint": "Kratos with Leviathan Axe",
  "purpose": "gameplay"
}
```

## Gameplay video clue

```json
{
  "type": "video",
  "assetType": "video",
  "entity": "Minecraft Creeper",
  "localizedName": "كريبر",
  "franchise": "Minecraft",
  "entityType": "enemy",
  "categoryType": "games",
  "searchContext": "creeper exploding gameplay",
  "duration": 6
}
```

---

# Difficulty Guide

## Easy

- Very famous games, characters, mechanics, items, or enemies.
- Examples: Mario jumps on enemies, Minecraft creeper explodes, Kratos in God of War, Fortnite building, GTA open world.

## Medium

- Specific but recognizable facts for regular players.
- Examples: Zelda Master Sword, Elden Ring runes, Assassin's Creed hidden blade, Portal portal gun, The Last of Us clickers.

## Hard

- Deeper gameplay knowledge, boss names, faction/class mechanics, mission names, map details, or item effects.
- Must still be fair and recognizable to fans; do not ask random release dates unless iconic.

---

# Good Question Examples

- وش الأداة اللي تستخدمها Chell للتنقل بين الجدران في Portal؟
- في The Last of Us، وش اسم المصابين اللي يعتمدون على الصوت بدل النظر؟
- أي لعبة تستخدم الـ Runes كمورد للتطوير بعد هزيمة الأعداء؟
- وش السلاح الخفي المعروف عند جماعة الأساسنز؟
- في Mario Kart، وش العنصر اللي يطارد صاحب المركز الأول؟

# Bad Question Examples

- من هو بطل لعبة مشهورة؟ ← عام جدًا.
- ما اللعبة التي تحتوي على قتال؟ ← ينطبق على آلاف الألعاب.
- من الشخصية القوية في اللعبة؟ ← رأي وغامض.
- ما اسم اللعبة التي يحبها اللاعبون؟ ← غير قابل للتحقق.
