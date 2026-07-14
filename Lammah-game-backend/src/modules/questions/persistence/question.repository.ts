import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, UpdateQuery } from 'mongoose';
import { Question } from '../schemas/question.schema';
import { QueryQuestionsDto } from '../dto/query-questions.dto';
import { QuestionPoints, QuestionStatus } from '../schemas/question.schema';

@Injectable()
export class QuestionRepository {
  constructor(
    @InjectModel(Question.name) private readonly model: Model<Question>,
  ) {}

  create(payload: Record<string, unknown>) {
    return this.model.create(payload);
  }

  async insertMany(payloads: Record<string, unknown>[]) {
    const saved = await this.model.insertMany(payloads);
    return saved.map((question) =>
      (
        question as unknown as { toObject(): Record<string, unknown> }
      ).toObject(),
    );
  }

  findAll(includeAnswers: boolean) {
    const query = this.model.find().populate('category');
    if (!includeAnswers) query.select('-answer -correctAnswer');
    return query.exec();
  }

  findAiGenerated(filters: QueryQuestionsDto) {
    const query: FilterQuery<Question> = { source: 'ai' };
    for (const key of [
      'status',
      'difficulty',
      'gameMode',
      'assetStatus',
    ] as const)
      if (filters[key]) query[key] = filters[key];
    if (filters.source) query.source = filters.source;
    if (filters.category && Types.ObjectId.isValid(filters.category))
      query.category = new Types.ObjectId(filters.category);
    if (filters.catalog && Types.ObjectId.isValid(filters.catalog))
      query.catalogId = new Types.ObjectId(filters.catalog);
    if (filters.search)
      query.question = {
        $regex: filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    return this.model
      .find(query)
      .sort({ createdAt: -1 })
      .populate('category')
      .exec();
  }

  findById(id: string, includeAnswer = true) {
    const query = this.model.findById(id).populate('category');
    if (!includeAnswer) query.select('-answer -correctAnswer');
    return query.exec();
  }

  findDocumentById(id: string) {
    return this.model.findById(id).exec();
  }

  updateById(id: string, update: UpdateQuery<Question>) {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('category');
  }

  deleteById(id: string) {
    return this.model.findByIdAndDelete(id).exec();
  }

  updateMusicTrackQuestions(
    musicTrackId: Types.ObjectId,
    update: UpdateQuery<Question>,
  ) {
    return this.model.updateMany({ musicTrack: musicTrackId }, update).exec();
  }

  findMusicQuestionById(id: string) {
    return this.model.findById(id).exec();
  }

  findApprovedByCategoryAndPoints(categoryId: string, points: number) {
    return this.model
      .find({
        category: new Types.ObjectId(categoryId),
        points,
        status: 'approved',
      })
      .exec();
  }

  findQuestionTexts(categoryId: string) {
    return this.model
      .find({ category: new Types.ObjectId(categoryId) })
      .select('question')
      .lean()
      .exec();
  }

  findEligibleForGame(options: {
    categoryId: string;
    points: QuestionPoints;
    freeGameOnly: boolean;
  }) {
    return this.model
      .find({
        category: new Types.ObjectId(options.categoryId),
        points: options.points,
        status: QuestionStatus.APPROVED,
        ...(options.freeGameOnly ? { isFreeGameQuestion: true } : {}),
      })
      .sort(options.freeGameOnly ? { createdAt: 1, _id: 1 } : {})
      .exec();
  }

  bulkDeleteAi(ids: Types.ObjectId[]) {
    return this.model.deleteMany({ _id: { $in: ids }, source: 'ai' }).exec();
  }

  bulkSetAiStatus(ids: Types.ObjectId[], status: 'approved' | 'rejected') {
    return this.model
      .updateMany(
        { _id: { $in: ids }, source: 'ai' },
        { $set: { status, updatedAt: new Date() } },
      )
      .exec();
  }
}
