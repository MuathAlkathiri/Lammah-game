import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QueryQuestionsService } from './application/query-questions.service';
import { MutateQuestionService } from './application/mutate-question.service';
import { ReviewQuestionService } from './application/review-question.service';
import { QuestionAssetRetryService } from './application/question-asset-retry.service';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { BulkQuestionActionDto } from './dto/review-question.dto';
import { QuestionResponseMapper } from './mappers/question-response.mapper';
import {
  BulkQuestionActionResponseDto,
  QuestionDetailResponseDto,
  QuestionListResponseDto,
  QuestionMutationResponseDto,
} from './dto/question-response.dto';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';
import { Question } from './schemas/question.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  ids,
  publicQuestionExample,
  questionExample,
} from '../../common/swagger/examples';

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly queries: QueryQuestionsService,
    private readonly mutations: MutateQuestionService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'questionsCreate',
    summary: 'Create a new question',
  })
  @ApiBody({
    type: CreateQuestionDto,
    examples: {
      default: {
        summary: 'Create approved free-game question',
        value: {
          category: ids.category,
          question: 'What planet is known as the Red Planet?',
          answer: 'Mars',
          explanation: 'Mars appears red because of iron oxide on its surface.',
          difficulty: 'easy',
          points: 200,
          type: 'text',
          status: 'approved',
          source: 'manual',
          isFreeGameQuestion: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
    type: QuestionMutationResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Question created successfully',
        data: questionExample,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createQuestionDto: CreateQuestionDto): Promise<{
    statusCode: number;
    message: string;
    data: Question;
  }> {
    const question = await this.mutations.create(createQuestionDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Question created successfully',
      data: QuestionResponseMapper.toResponse(question) as unknown as Question,
    };
  }

  @Get()
  @ApiOperation({ operationId: 'questionsList', summary: 'Get all questions' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully. Answers are hidden.',
    type: QuestionListResponseDto,
    schema: {
      example: {
        statusCode: 200,
        data: [publicQuestionExample],
      },
    },
  })
  async findAll(): Promise<{
    statusCode: number;
    data: Question[];
  }> {
    const questions = await this.queries.listPublic();
    return {
      statusCode: HttpStatus.OK,
      data: QuestionResponseMapper.toResponseList(
        questions,
      ) as unknown as Question[],
    };
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'questionsGetById',
    summary: 'Get a specific question by ID',
  })
  @ApiParam({
    name: 'id',
    example: ids.question,
    description: 'Question MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully. Answer is hidden.',
    type: QuestionDetailResponseDto,
    schema: {
      example: {
        statusCode: 200,
        data: publicQuestionExample,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    schema: {
      example: {
        statusCode: 404,
        message: `Question with ID "${ids.question}" not found`,
        error: 'Not Found',
      },
    },
  })
  async findById(@Param('id') id: string): Promise<{
    statusCode: number;
    data: Question;
  }> {
    const question = await this.queries.getPublic(id);
    return {
      statusCode: HttpStatus.OK,
      data: QuestionResponseMapper.toResponse(question) as unknown as Question,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'questionsUpdate',
    summary: 'Update a question',
  })
  @ApiParam({
    name: 'id',
    example: ids.question,
    description: 'Question MongoDB ObjectId',
  })
  @ApiBody({
    type: UpdateQuestionDto,
    examples: {
      default: {
        summary: 'Approve and mark as free-game question',
        value: {
          status: 'approved',
          isFreeGameQuestion: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
    type: QuestionMutationResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Question updated successfully',
        data: questionExample,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Question;
  }> {
    const question = await this.mutations.update(id, updateQuestionDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Question updated successfully',
      data: QuestionResponseMapper.toResponse(question) as unknown as Question,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'questionsDelete',
    summary: 'Delete a question',
  })
  @ApiParam({
    name: 'id',
    example: ids.question,
    description: 'Question MongoDB ObjectId',
  })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.mutations.delete(id);
  }
}

@ApiTags('Admin Questions')
@ApiBearerAuth()
@Controller('admin/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminQuestionsController {
  constructor(
    private readonly queries: QueryQuestionsService,
    private readonly reviews: ReviewQuestionService,
    private readonly assetRetry: QuestionAssetRetryService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'adminQuestionsList',
    summary: 'Admin: get all questions including answers',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully with answers.',
    type: QuestionListResponseDto,
    schema: {
      example: {
        statusCode: 200,
        data: [questionExample],
      },
    },
  })
  async findAll(): Promise<{
    statusCode: number;
    data: Question[];
  }> {
    const questions = await this.queries.listAdmin();
    return {
      statusCode: HttpStatus.OK,
      data: QuestionResponseMapper.toResponseList(
        questions,
      ) as unknown as Question[],
    };
  }

  @Get('ai-generated/list')
  @ApiOperation({
    operationId: 'questionsListAiGenerated',
    summary: 'List AI-generated questions for review',
  })
  @ApiResponse({ status: 200, type: QuestionListResponseDto })
  async findAiGenerated(@Query() filters: QueryQuestionsDto) {
    return {
      statusCode: HttpStatus.OK,
      data: QuestionResponseMapper.toResponseList(
        await this.queries.listAiGenerated(filters),
      ),
    };
  }

  @Post('bulk-action')
  @ApiOperation({
    operationId: 'questionsBulkAction',
    summary: 'Apply an admin review action to questions',
  })
  @ApiResponse({ status: 201, type: BulkQuestionActionResponseDto })
  async bulkAction(@Body() body: BulkQuestionActionDto) {
    return this.reviews.bulkAction(body);
  }

  @Post(':id/retry-primary-asset')
  @ApiOperation({
    operationId: 'questionsRetryPrimaryAsset',
    summary: 'Retry primary asset resolution',
  })
  @ApiResponse({ status: 201, type: QuestionDetailResponseDto })
  async retryPrimaryAsset(@Param('id') id: string) {
    return {
      data: QuestionResponseMapper.toResponse(
        await this.assetRetry.retry(id, 'primary'),
      ),
    };
  }

  @Post(':id/retry-cover-image')
  @ApiOperation({
    operationId: 'questionsRetryCoverImage',
    summary: 'Retry cover image resolution',
  })
  @ApiResponse({ status: 201, type: QuestionDetailResponseDto })
  async retryCoverImage(@Param('id') id: string) {
    return {
      data: QuestionResponseMapper.toResponse(
        await this.assetRetry.retry(id, 'cover'),
      ),
    };
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'adminQuestionsGetById',
    summary: 'Admin: get a specific question including answer',
  })
  @ApiParam({
    name: 'id',
    example: ids.question,
    description: 'Question MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully with answer.',
    type: QuestionDetailResponseDto,
    schema: {
      example: {
        statusCode: 200,
        data: questionExample,
      },
    },
  })
  async findById(@Param('id') id: string): Promise<{
    statusCode: number;
    data: Question;
  }> {
    const question = await this.queries.getAdmin(id);
    return {
      statusCode: HttpStatus.OK,
      data: QuestionResponseMapper.toResponse(question) as unknown as Question,
    };
  }
}
