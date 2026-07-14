import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Question } from './schemas/question.schema';
import { CategoriesService } from '../categories/categories.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';
import { Category } from '../categories/schemas/category.schema';
import { AssetService } from '../ai-agent/application/asset.service';
import { QuestionRepository } from './persistence/question.repository';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import {
  AssetRequest,
  AssetMetadata,
} from '../ai-agent/contracts/asset-provider.interface';
import {
  AssetStatus,
  QuestionCoverImage,
  QuestionPrimaryAsset,
} from './schemas/question.schema';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questions: QuestionRepository,
    private categoriesService: CategoriesService,
    private assetService: AssetService,
  ) {}

  async create(createQuestionDto: CreateQuestionDto): Promise<Question> {
    const categoryId =
      createQuestionDto.category ?? createQuestionDto.categoryId;

    if (!categoryId) {
      throw new BadRequestException('Category ID is required');
    }

    const category =
      await this.categoriesService.findByIdForQuestionAuthoring(categoryId);
    const payload = this.normalizeQuestionPayload(
      createQuestionDto,
      category,
      true,
    );

    const question = await this.questions.create({
      ...payload,
      category: new Types.ObjectId(categoryId),
    });

    return question.populate('category');
  }

  async findAll(): Promise<Question[]> {
    return this.questions.findAll(false);
  }

  async findAllWithAnswers(): Promise<Question[]> {
    return this.questions.findAll(true);
  }

  async findAiGenerated(filters: QueryQuestionsDto) {
    return this.questions.findAiGenerated(filters);
  }

  async bulkAction(ids: string[], action: 'approve' | 'reject' | 'delete') {
    const objectIds = ids
      .filter(Types.ObjectId.isValid)
      .map((id) => new Types.ObjectId(id));
    if (action === 'delete') return this.questions.bulkDeleteAi(objectIds);
    return this.questions.bulkSetAiStatus(
      objectIds,
      action === 'approve' ? 'approved' : 'rejected',
    );
  }

  async retryAsset(id: string, target: 'primary' | 'cover') {
    const question = await this.questions.findDocumentById(id);
    if (!question)
      throw new NotFoundException(`Question with ID "${id}" not found`);
    const request =
      target === 'primary'
        ? question.primaryAssetRequest
        : question.coverImageRequest;
    if (!request)
      throw new BadRequestException(`No stored ${target} asset request`);
    const result = await this.assetService.process(request as AssetRequest);
    if (target === 'cover') {
      question.coverImageStatus =
        result.assetStatus === 'NOT_REQUIRED'
          ? undefined
          : (result.assetStatus as AssetStatus);
      question.coverImage =
        result.assetStatus === 'READY' ? this.toCoverImage(result.asset) : null;
      question.coverImageFailureReason =
        result.assetStatus === 'FAILED' ? result.assetFailureReason : undefined;
    } else {
      question.assetStatus = result.assetStatus as AssetStatus;
      question.primaryAsset =
        result.assetStatus === 'READY'
          ? this.toPrimaryAsset(result.asset)
          : null;
      question.mediaUrl =
        result.assetStatus === 'READY' ? result.asset.url : undefined;
      question.assetFailureReason =
        result.assetStatus === 'FAILED' ? result.assetFailureReason : undefined;
      question.assetFailureStep =
        result.assetStatus === 'FAILED' ? result.assetFailureStep : undefined;
      question.assetFailureDiagnostics =
        result.assetStatus === 'FAILED'
          ? Array.isArray(result.assetFailureDiagnostics)
            ? { attempts: result.assetFailureDiagnostics }
            : result.assetFailureDiagnostics
          : undefined;
    }
    await question.save();
    return question.populate('category');
  }

  private toPrimaryAsset(asset: AssetMetadata): QuestionPrimaryAsset {
    return { ...asset, type: asset.type as QuestionPrimaryAsset['type'] };
  }

  private toCoverImage(asset: AssetMetadata): QuestionCoverImage {
    return { ...asset, type: 'image' };
  }

  async findById(id: string): Promise<Question> {
    const question = await this.questions.findById(id, false);

    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }

    return question;
  }

  async findByIdWithAnswer(id: string): Promise<Question> {
    const question = await this.questions.findById(id, true);

    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }

    return question;
  }

  async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<Question> {
    const categoryId =
      updateQuestionDto.category ?? updateQuestionDto.categoryId;
    let category: Category | undefined;

    if (categoryId) {
      category =
        await this.categoriesService.findByIdForQuestionAuthoring(categoryId);
    }

    const payload = this.normalizeQuestionPayload(updateQuestionDto, category);
    const updateData = {
      ...payload,
      ...(categoryId && {
        category: new Types.ObjectId(categoryId),
      }),
      updatedAt: new Date(),
    };

    const question = await this.questions.updateById(id, updateData);

    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }

    return question;
  }

  async delete(id: string): Promise<void> {
    const result = await this.questions.deleteById(id);
    if (!result) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }
  }

  async findByIdAndPoints(
    categoryId: string,
    points: number,
  ): Promise<Question[]> {
    return this.questions.findApprovedByCategoryAndPoints(categoryId, points);
  }

  private normalizeQuestionPayload(
    dto: CreateQuestionDto | UpdateQuestionDto,
    category?: Category,
    requireCoreFields = false,
  ) {
    const payload = { ...dto };
    const createdBy = payload.createdBy;
    delete payload.category;
    delete payload.categoryId;
    delete payload.createdBy;
    const correctAnswer = dto.correctAnswer ?? dto.answer;
    const answer = dto.answer ?? dto.correctAnswer;
    const score = dto.score ?? dto.points;
    const points = dto.points ?? dto.score;
    const primaryAsset = dto.primaryAsset ?? undefined;
    const mediaUrl = dto.mediaUrl ?? primaryAsset?.url;
    const type = dto.type ?? primaryAsset?.type;
    const catalogId = this.resolveCatalogObjectId(category);

    if (requireCoreFields && !answer) {
      throw new BadRequestException('Answer or correctAnswer is required');
    }

    if (requireCoreFields && !points) {
      throw new BadRequestException('Points or score is required');
    }

    return {
      ...payload,
      ...(answer ? { answer } : {}),
      ...(correctAnswer ? { correctAnswer } : {}),
      ...(points ? { points } : {}),
      ...(score ? { score } : {}),
      ...(type ? { type } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(primaryAsset !== undefined ? { primaryAsset } : {}),
      ...(catalogId ? { catalogId } : {}),
      ...(createdBy ? { createdBy: new Types.ObjectId(createdBy) } : {}),
    };
  }

  private resolveCatalogObjectId(
    category?: Category,
  ): Types.ObjectId | undefined {
    const catalogId = category?.catalogId;

    if (!catalogId) {
      return undefined;
    }

    if (catalogId instanceof Types.ObjectId) {
      return catalogId;
    }

    if (typeof catalogId === 'object' && '_id' in catalogId) {
      return catalogId._id as Types.ObjectId;
    }

    if (typeof catalogId === 'string' && Types.ObjectId.isValid(catalogId)) {
      return new Types.ObjectId(catalogId);
    }

    return undefined;
  }
}
