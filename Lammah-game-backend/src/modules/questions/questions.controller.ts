import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { QuestionsService } from './questions.service';
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
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new question' })
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
    const question = await this.questionsService.create(createQuestionDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Question created successfully',
      data: question,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all questions' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully. Answers are hidden.',
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
    const questions = await this.questionsService.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: questions,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific question by ID' })
  @ApiParam({
    name: 'id',
    example: ids.question,
    description: 'Question MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully. Answer is hidden.',
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
    const question = await this.questionsService.findById(id);
    return {
      statusCode: HttpStatus.OK,
      data: question,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question' })
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
    const question = await this.questionsService.update(id, updateQuestionDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Question updated successfully',
      data: question,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({
    name: 'id',
    example: ids.question,
    description: 'Question MongoDB ObjectId',
  })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.questionsService.delete(id);
  }
}
