import { Controller, Post, Body, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ids } from '../../common/swagger/examples';

@ApiTags('AI Agent')
@ApiBearerAuth()
@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('generate-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBody({
    type: GenerateQuestionsDto,
    examples: {
      default: {
        summary: 'Generate questions for category',
        value: {
          categoryId: ids.category,
          count: 6,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Generate questions for a category using the configured AI provider',
    description:
      'Generates open-answer questions for a selected category. ' +
      'Questions are saved as drafts and must be reviewed/approved by admin before use in games.',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions generated and saved as drafts successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Questions generated successfully',
        count: 6,
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            category: '507f1f77bcf86cd799439012',
            question: 'What is the largest planet in our solar system?',
            answer: 'Jupiter',
            explanation:
              'Jupiter is the largest planet with a mass twice that of all others combined.',
            difficulty: 'easy',
            points: 200,
            type: 'text',
            status: 'draft',
            source: 'ai',
            createdAt: '2024-06-19T10:00:00Z',
            updatedAt: '2024-06-19T10:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - category not found or validation error',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - AI provider API error or other issues',
  })
  async generateQuestions(@Body() generateQuestionsDto: GenerateQuestionsDto) {
    const result =
      await this.aiAgentService.generateQuestions(generateQuestionsDto);

    return {
      statusCode: HttpStatus.OK,
      ...result,
    };
  }
}
