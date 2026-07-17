import { Injectable } from '@nestjs/common';
import { LlmClientService } from '../infrastructure/ai/llm-client.service';
import { AgentExecutionContext, LlmAgent } from './llm-agent.interface';
import type { VerifiedEntity } from '../application/entity-verification.types';

export type AssetEntityType =
  | 'character'
  | 'technique'
  | 'object'
  | 'place'
  | 'creature'
  | 'organization'
  | 'clan'
  | 'ability'
  | 'weapon'
  | 'vehicle'
  | 'song'
  | 'artist'
  | 'actor'
  | 'historical-person'
  | 'football-player'
  | 'football-club'
  | 'country'
  | 'city'
  | 'landmark'
  | 'generic-topic'
  | 'unknown';
export type PlannerFailure =
  | 'ENTITY_NOT_CANONICAL'
  | 'ENTITY_IS_DESCRIPTION'
  | 'ENTITY_TOO_GENERIC'
  | 'ENTITY_NOT_RESOLVED';
export type AssetPlannerDiagnostics = {
  entityType: AssetEntityType;
  canonicalEntity?: string;
  searchEntity?: string;
  coverTopic?: string;
  plannerDecision: string;
  primaryRequired: boolean;
  coverStrategy: string;
  plannerFailure?: PlannerFailure;
};
export type AssetPlans = {
  primaryAssetPlan: Record<string, unknown> | null;
  coverImagePlan: Record<string, unknown> | null;
  plannerDiagnostics: AssetPlannerDiagnostics;
};

const ENTITY_TYPES = new Set<AssetEntityType>([
  'character',
  'technique',
  'object',
  'place',
  'creature',
  'organization',
  'clan',
  'ability',
  'weapon',
  'vehicle',
  'song',
  'artist',
  'actor',
  'historical-person',
  'football-player',
  'football-club',
  'country',
  'city',
  'landmark',
  'generic-topic',
  'unknown',
]);
const DESCRIPTIVE_ENTITY =
  /^(character who|person (who|that)|someone (who|using)|a type of|one of|الشخصية التي|شخصية (تمتلك|تستخدم)|الشخص الذي|شخص يستخدم|الذي يستخدم|أحد (أعضاء|مستخدمي)|نوع من)/i;
const VERB_PHRASE =
  /(\b(using|uses|owns|has|possesses|belongs)\b|يستخدم|تستخدم|يمتلك|تمتلك|ينتمي|تسمح|يسمح)/i;

@Injectable()
export class AssetPlannerAgent implements LlmAgent<
  Record<string, unknown>,
  AssetPlans
> {
  readonly name = 'AssetPlannerAgent';
  constructor(private readonly llm: LlmClientService) {}

  async execute(
    input: Record<string, unknown>,
    context: AgentExecutionContext,
  ) {
    const raw = await this.llm.completeJson<Partial<AssetPlans>>(
      `Plan assets from the draft using canonical named entities only. First classify the correct answer as one of: character, technique, object, place, creature, organization, clan, ability, weapon, vehicle, song, artist, actor, historical-person, football-player, football-club, country, city, landmark, generic-topic, unknown. Each plan must include canonicalEntity, entityType, aliases, franchise, searchEntity, and searchContext. entity must equal canonicalEntity. A decorative cover may include coverTopic, but it must be a real named franchise, organization, team, place, or canonical topic; never invent a visual scene or location. Never turn a concept into a person and never emit descriptions such as "character who", "person that", "someone using", "شخصية تستخدم", "الذي يستخدم", "أحد أعضاء", or "نوع من". For ordinary trivia concepts, primaryAssetPlan must be null; use an optional decorative cover. Identifying image/audio/music modes may require a primary asset. Do not choose providers, URLs, or reuse the question as an entity. Draft: ${JSON.stringify(input)}`,
      context.modelConfig?.temperature ?? 0.1,
    );
    return this.normalizePlans(input, raw);
  }

  normalizePlans(
    input: Record<string, unknown>,
    raw: Partial<AssetPlans>,
  ): AssetPlans {
    const verified = this.verifiedEntity(input.verifiedEntity);
    const rawPrimary = this.record(raw.primaryAssetPlan);
    const rawCover = this.record(raw.coverImagePlan);
    const answer =
      verified?.canonicalAnswer ||
      this.text(input.correctAnswer) ||
      this.text(input.answer);
    const question = this.text(input.question);
    const proposed =
      this.text(rawPrimary?.canonicalEntity) ||
      this.text(rawPrimary?.entity) ||
      this.text(rawCover?.canonicalEntity) ||
      this.text(rawCover?.entity);
    const proposedFailure = this.validateEntity(proposed, question);
    const answerFailure = this.validateEntity(answer, question);
    const canonicalEntity =
      verified?.canonicalEntity ||
      (!answerFailure ? answer : !proposedFailure ? proposed : '');
    const plannerFailure =
      proposedFailure && canonicalEntity
        ? proposedFailure
        : (answerFailure ?? proposedFailure);
    const franchise =
      verified?.franchise ||
      this.text(rawPrimary?.franchise) ||
      this.text(rawCover?.franchise) ||
      this.text(input.franchise);
    const entityType = this.classifyEntity(
      canonicalEntity,
      this.text(rawPrimary?.entityType) || this.text(rawCover?.entityType),
    );
    const primaryRequired = this.primaryRequired(input);
    const aliases = verified?.aliases.length
      ? verified.aliases
      : this.aliases(canonicalEntity, rawPrimary?.aliases, rawCover?.aliases);
    const searchEntity = canonicalEntity
      ? [canonicalEntity, franchise].filter(Boolean).join(' ')
      : undefined;
    const coverStrategy = this.coverStrategy(entityType, Boolean(franchise));
    const common = {
      canonicalEntity,
      entity: canonicalEntity,
      entityType,
      aliases,
      franchise: franchise || undefined,
      searchEntity,
      query: searchEntity,
      searchContext:
        this.text(rawPrimary?.searchContext) ||
        this.text(rawCover?.searchContext) ||
        undefined,
    };
    const primaryAssetPlan =
      primaryRequired && canonicalEntity
        ? {
            ...rawPrimary,
            ...common,
            assetType: this.primaryAssetType(input, rawPrimary),
            purpose: 'gameplay',
          }
        : null;
    const proposedCoverTopic =
      this.text(rawCover?.coverTopic) ||
      (this.text(rawCover?.entity) !== canonicalEntity
        ? this.text(rawCover?.entity)
        : '');
    const acceptedCoverTopic = this.canonicalCoverTopic(
      proposedCoverTopic,
      franchise,
      entityType,
    );
    const coverEntity =
      acceptedCoverTopic ||
      (entityType === 'character' && franchise
        ? franchise
        : canonicalEntity || franchise);
    const coverImagePlan = coverEntity
      ? {
          ...rawCover,
          assetType: 'image',
          purpose: 'decorative',
          avoidAnswerLeakage: true,
          entity: coverEntity,
          canonicalEntity: coverEntity,
          coverTopic: coverEntity,
          entityType:
            entityType === 'character' && franchise ? 'franchise' : entityType,
          franchise: franchise || undefined,
          query: [coverEntity, entityType === 'character' ? '' : franchise]
            .filter(Boolean)
            .join(' '),
          searchEntity: [
            coverEntity,
            entityType === 'character' ? '' : franchise,
          ]
            .filter(Boolean)
            .join(' '),
          coverStrategy,
        }
      : null;
    return {
      primaryAssetPlan,
      coverImagePlan,
      plannerDiagnostics: {
        entityType,
        ...(canonicalEntity ? { canonicalEntity } : {}),
        ...(searchEntity ? { searchEntity } : {}),
        ...(coverEntity ? { coverTopic: coverEntity } : {}),
        plannerDecision: canonicalEntity
          ? primaryRequired
            ? 'canonical-primary-and-cover'
            : 'canonical-cover-only'
          : 'no-provider-request',
        primaryRequired,
        coverStrategy,
        ...(plannerFailure ? { plannerFailure } : {}),
      },
    };
  }

  private verifiedEntity(value: unknown): VerifiedEntity | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as Partial<VerifiedEntity>;
    return typeof candidate.canonicalEntity === 'string' &&
      typeof candidate.canonicalAnswer === 'string' &&
      Array.isArray(candidate.aliases)
      ? (candidate as VerifiedEntity)
      : undefined;
  }

  validateEntity(value: string, question = ''): PlannerFailure | undefined {
    const entity = value.trim();
    if (!entity) return 'ENTITY_NOT_RESOLVED';
    if (this.normalize(entity) === this.normalize(question))
      return 'ENTITY_NOT_CANONICAL';
    if (DESCRIPTIVE_ENTITY.test(entity) || VERB_PHRASE.test(entity))
      return 'ENTITY_IS_DESCRIPTION';
    if (entity.length > 80 || entity.split(/\s+/).length > 8)
      return 'ENTITY_NOT_CANONICAL';
    if (
      /^(thing|person|character|place|topic|شيء|شخص|شخصية|مكان|موضوع)$/i.test(
        entity,
      )
    )
      return 'ENTITY_TOO_GENERIC';
    return undefined;
  }

  classifyEntity(entity: string, proposed: string): AssetEntityType {
    const known: Record<string, AssetEntityType> = {
      'hinata hyuga': 'character',
      hinata: 'character',
      'sasuke uchiha': 'character',
      sasuke: 'character',
      'rock lee': 'character',
      'kakashi hatake': 'character',
      kakashi: 'character',
      byakugan: 'ability',
      sharingan: 'ability',
      rasengan: 'technique',
      chidori: 'technique',
      kamui: 'technique',
      akatsuki: 'organization',
      konoha: 'place',
      'nine tails': 'creature',
      kurama: 'creature',
    };
    const exact = known[this.normalize(entity)];
    if (exact) return exact;
    const normalizedProposed = proposed.trim().toLowerCase().replace(/_/g, '-');
    return ENTITY_TYPES.has(normalizedProposed as AssetEntityType)
      ? (normalizedProposed as AssetEntityType)
      : 'unknown';
  }

  private primaryRequired(input: Record<string, unknown>) {
    if (this.text(input.type) === 'text') return false;
    return new Set([
      'identifyCharacter',
      'identifyImage',
      'identifyVoice',
      'identifySong',
      'identifySinger',
      'identifyMusicIntro',
    ]).has(this.text(input.gameMode));
  }
  private primaryAssetType(
    input: Record<string, unknown>,
    raw: Record<string, unknown> | undefined,
  ) {
    const gameMode = this.text(input.gameMode);
    if (['identifyVoice'].includes(gameMode)) return 'audio';
    if (
      ['identifySong', 'identifySinger', 'identifyMusicIntro'].includes(
        gameMode,
      )
    )
      return this.text(raw?.assetType) || 'musicPreview';
    return 'image';
  }
  private coverStrategy(type: AssetEntityType, hasFranchise: boolean) {
    if (type === 'character' && hasFranchise)
      return 'franchise-or-organization';
    const strategies: Partial<Record<AssetEntityType, string>> = {
      technique: 'technique-artwork',
      ability: 'ability-artwork',
      clan: 'clan-symbol',
      organization: 'organization-emblem',
      creature: 'creature-image',
      place: 'place-image',
      city: 'place-image',
      landmark: 'place-image',
      'generic-topic': 'thematic-image',
    };
    return strategies[type] ?? 'canonical-topic-image';
  }
  private canonicalCoverTopic(
    proposed: string,
    franchise: string,
    entityType: AssetEntityType,
  ) {
    if (!proposed || this.validateEntity(proposed)) return '';
    if (
      /\b(training ground|area|zone|scene|mysterious|exploding ninja|ساحة|منطقة|ميدان|مشهد|غامض|متفجر)\b/i.test(
        proposed,
      )
    )
      return '';
    if (this.normalize(proposed) === this.normalize(franchise))
      return franchise;
    if (entityType === 'character') {
      const topicType = this.classifyEntity(proposed, '');
      return ['organization', 'clan', 'place'].includes(topicType)
        ? proposed
        : '';
    }
    return proposed;
  }
  private aliases(canonical: string, ...values: unknown[]) {
    return Array.from(
      new Set(
        [
          canonical,
          ...values.flatMap((value) => (Array.isArray(value) ? value : [])),
        ]
          .filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0,
          )
          .map((value) => value.trim()),
      ),
    );
  }
  private record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }
  private text(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }
  private normalize(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .toLowerCase();
  }
}
