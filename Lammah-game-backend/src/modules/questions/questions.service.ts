import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question } from './schemas/question.schema';
import { CategoriesService } from '../categories/categories.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<Question>,
    private categoriesService: CategoriesService,
  ) {}

  async create(createQuestionDto: CreateQuestionDto): Promise<Question> {
    // Verify category exists
    await this.categoriesService.findById(createQuestionDto.category);

    const question = await this.questionModel.create({
      ...createQuestionDto,
      category: new Types.ObjectId(createQuestionDto.category),
    });

    return question.populate('category');
  }

  async findAll(): Promise<Question[]> {
    return this.questionModel.find().select('-answer').populate('category').exec();
  }

  async findById(id: string): Promise<Question> {
    const question = await this.questionModel
      .findById(id)
      .select('-answer')
      .populate('category')
      .exec();

    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }

    return question;
  }

  async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<Question> {
    // If category is being updated, verify it exists
    if (updateQuestionDto.category) {
      await this.categoriesService.findById(updateQuestionDto.category);
    }

    const updateData = {
      ...updateQuestionDto,
      ...(updateQuestionDto.category && {
        category: new Types.ObjectId(updateQuestionDto.category),
      }),
      updatedAt: new Date(),
    };

    const question = await this.questionModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('category');

    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }

    return question;
  }

  async delete(id: string): Promise<void> {
    const result = await this.questionModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }
  }

  async findByIdAndPoints(categoryId: string, points: number): Promise<Question[]> {
    return this.questionModel
      .find({
        category: new Types.ObjectId(categoryId),
        points,
        status: 'approved',
      })
      .exec();
  }
}
