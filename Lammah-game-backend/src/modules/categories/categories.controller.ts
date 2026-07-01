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
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';
import { Category } from './schemas/category.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { categoryExample, ids } from '../../common/swagger/examples';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({
    type: CreateCategoryDto,
    examples: {
      default: {
        summary: 'Create category',
        value: {
          name: 'Science',
          slug: 'science',
          description: 'Science and discovery questions',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Category created successfully',
        data: categoryExample,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<{
    statusCode: number;
    message: string;
    data: Category;
  }> {
    const category = await this.categoriesService.create(createCategoryDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Category created successfully',
      data: category,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        data: [categoryExample],
      },
    },
  })
  async findAll(): Promise<{
    statusCode: number;
    data: Category[];
  }> {
    const categories = await this.categoriesService.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: categories,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific category by ID' })
  @ApiParam({
    name: 'id',
    example: ids.category,
    description: 'Category MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        data: categoryExample,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
    schema: {
      example: {
        statusCode: 404,
        message: `Category with ID "${ids.category}" not found`,
        error: 'Not Found',
      },
    },
  })
  async findById(@Param('id') id: string): Promise<{
    statusCode: number;
    data: Category;
  }> {
    const category = await this.categoriesService.findById(id);
    return {
      statusCode: HttpStatus.OK,
      data: category,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({
    name: 'id',
    example: ids.category,
    description: 'Category MongoDB ObjectId',
  })
  @ApiBody({
    type: UpdateCategoryDto,
    examples: {
      default: {
        summary: 'Update category',
        value: {
          name: 'Science Updated',
          description: 'Updated science category description',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Category updated successfully',
        data: {
          ...categoryExample,
          name: 'Science Updated',
          description: 'Updated science category description',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Category;
  }> {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Category updated successfully',
      data: category,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({
    name: 'id',
    example: ids.category,
    description: 'Category MongoDB ObjectId',
  })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.categoriesService.delete(id);
  }
}
