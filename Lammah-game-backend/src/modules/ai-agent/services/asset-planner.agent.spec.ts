import {
  AssetPlannerAgent,
  AssetEntityType,
} from '../agents/asset-planner.agent';
import { LlmClientService } from '../infrastructure/ai/llm-client.service';

describe('AssetPlannerAgent canonical planning', () => {
  const planner = new AssetPlannerAgent({} as LlmClientService);

  it.each<[string, AssetEntityType]>([
    ['Hinata Hyuga', 'character'],
    ['Sasuke', 'character'],
    ['Rock Lee', 'character'],
    ['Kakashi', 'character'],
    ['Byakugan', 'ability'],
    ['Sharingan', 'ability'],
    ['Rasengan', 'technique'],
    ['Chidori', 'technique'],
    ['Kamui', 'technique'],
    ['Akatsuki', 'organization'],
    ['Konoha', 'place'],
    ['Nine Tails', 'creature'],
  ])('classifies %s as %s', (entity, expected) => {
    expect(planner.classifyEntity(entity, 'unknown')).toBe(expected);
  });

  it.each([
    'شخصية تستخدم البياكوغان',
    'شخصية تستخدم الكاموي',
    'أحد أعضاء الأكاتسوكي',
    'نوع من التشاكرا',
    'character who uses Kamui',
  ])('rejects descriptive entity: %s', (entity) => {
    expect(planner.validateEntity(entity)).toBe('ENTITY_IS_DESCRIPTION');
  });

  it('replaces a descriptive proposal with the canonical answer and suppresses trivia primary', () => {
    const result = planner.normalizePlans(
      {
        question: 'ما هي التقنية التي تسمح للمستخدم بقطع الأبعاد؟',
        correctAnswer: 'Kamui',
        gameMode: 'trivia',
      },
      {
        primaryAssetPlan: {
          entity: 'شخصية تستخدم الكاموي',
          entityType: 'character',
          franchise: 'Naruto',
        },
        coverImagePlan: { franchise: 'Naruto' },
      },
    );
    expect(result.primaryAssetPlan).toBeNull();
    expect(result.coverImagePlan).toMatchObject({
      entity: 'Kamui',
      entityType: 'technique',
      searchEntity: 'Kamui Naruto',
      purpose: 'decorative',
    });
    expect(result.plannerDiagnostics).toMatchObject({
      canonicalEntity: 'Kamui',
      entityType: 'technique',
      searchEntity: 'Kamui Naruto',
      plannerDecision: 'canonical-cover-only',
      primaryRequired: false,
      plannerFailure: 'ENTITY_IS_DESCRIPTION',
    });
  });

  it('creates a canonical character primary only for an identifying mode', () => {
    const result = planner.normalizePlans(
      {
        question: 'من هذه الشخصية؟',
        correctAnswer: 'Hinata Hyuga',
        gameMode: 'identifyCharacter',
      },
      {
        primaryAssetPlan: {
          entity: 'الشخصية التي تستخدم البياكوغان',
          franchise: 'Naruto',
          categoryType: 'anime',
        },
        coverImagePlan: { franchise: 'Naruto' },
      },
    );
    expect(result.primaryAssetPlan).toMatchObject({
      entity: 'Hinata Hyuga',
      canonicalEntity: 'Hinata Hyuga',
      entityType: 'character',
      searchEntity: 'Hinata Hyuga Naruto',
      assetType: 'image',
      purpose: 'gameplay',
    });
    expect(result.coverImagePlan).toMatchObject({
      entity: 'Naruto',
      entityType: 'franchise',
      coverStrategy: 'franchise-or-organization',
    });
  });

  it('makes no provider request when neither answer nor proposal is canonical', () => {
    const result = planner.normalizePlans(
      {
        question: 'ما الإجابة؟',
        correctAnswer: 'نوع من التشاكرا',
        gameMode: 'trivia',
      },
      { primaryAssetPlan: null, coverImagePlan: null },
    );
    expect(result.primaryAssetPlan).toBeNull();
    expect(result.coverImagePlan).toBeNull();
    expect(result.plannerDiagnostics).toMatchObject({
      plannerDecision: 'no-provider-request',
      plannerFailure: 'ENTITY_IS_DESCRIPTION',
    });
  });
});
