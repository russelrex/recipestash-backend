import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createPostDto: CreatePostDto, @Request() req) {
    const post = await this.postsService.create(req.user.userId, createPostDto);
    return {
      success: true,
      message: 'Post created successfully',
      data: post,
    };
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const result = await this.postsService.findAll(pageNum, limitNum);
    return {
      success: true,
      data: result,
    };
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const posts = await this.postsService.findByUser(userId);
    return {
      success: true,
      data: posts,
    };
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  async findMyPosts(@Request() req) {
    const posts = await this.postsService.findByUser(req.user.userId);
    return {
      success: true,
      data: posts,
    };
  }

  @Get('recipe/:recipeId')
  async findByRecipe(@Param('recipeId') recipeId: string) {
    const posts = await this.postsService.getPostsByRecipe(recipeId);
    return {
      success: true,
      data: posts,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.postsService.findOneWithAuthor(id);
    return {
      success: true,
      data: post,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req,
  ) {
    const post = await this.postsService.update(
      id,
      req.user.userId,
      updatePostDto,
    );
    return {
      success: true,
      message: 'Post updated successfully',
      data: post,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    await this.postsService.remove(id, req.user.userId);
    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }

  @Patch(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('id') id: string, @Request() req) {
    console.log('req.user', req.user);
    const post = await this.postsService.toggleLike(id, req.user.userId);
    return {
      success: true,
      message: 'Like toggled successfully',
      data: post,
    };
  }

  @HttpPost(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    const comment = await this.postsService.createComment(
      postId,
      req.user.userId,
      createCommentDto,
    );
    return {
      success: true,
      message: 'Comment added successfully',
      data: comment,
    };
  }

  @Get(':id/comments')
  async getComments(@Param('id') postId: string) {
    const comments = await this.postsService.getComments(postId);
    return {
      success: true,
      data: comments,
    };
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('commentId') commentId: string, @Request() req) {
    await this.postsService.deleteComment(commentId, req.user.userId);
    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }
}
