import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Patch,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
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

  /** Paginated feed: requires auth, returns posts with isLiked for current user */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getPosts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '5',
    @Request() req: any,
  ) {
    console.log('\n📰 [PostsController] ============ GET POSTS ============');
    console.log('📰 [PostsController] Page:', page);
    console.log('📰 [PostsController] Limit:', limit);
    console.log('📰 [PostsController] User ID:', req.user?.userId);

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 5;

    const result = await this.postsService.getPosts(
      pageNum,
      limitNum,
      req.user.userId,
    );

    console.log('✅ [PostsController] Returned', result.posts.length, 'posts');
    console.log('✅ [PostsController] Has more:', result.hasMore);

    return result;
  }

  /** Legacy paginated list (no auth required, no isLiked) */
  @Get('list')
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const result = await this.postsService.findAll(pageNum, limitNum);
    return { success: true, data: result };
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

  /** Edit post (content only). PUT for spec compatibility. */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param('id') postId: string,
    @Body() updateData: { content: string },
    @Request() req: any,
  ) {
    console.log('\n✏️ [PostsController] ============ UPDATE POST ============');
    console.log('✏️ [PostsController] Post ID:', postId);
    console.log('✏️ [PostsController] User ID:', req.user?.userId);
    console.log('✏️ [PostsController] New content:', updateData?.content);

    const updatedPost = await this.postsService.updatePost(
      postId,
      req.user.userId,
      updateData?.content ?? '',
    );

    console.log('✅ [PostsController] Post updated successfully');

    return {
      message: 'Post updated successfully',
      post: updatedPost,
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') postId: string, @Request() req: any) {
    console.log('\n🗑️ [PostsController] ============ DELETE POST ============');
    console.log('🗑️ [PostsController] Post ID:', postId);
    console.log('🗑️ [PostsController] User ID:', req.user?.userId);

    await this.postsService.deletePost(postId, req.user.userId);

    console.log('✅ [PostsController] Post deleted successfully');

    return {
      message: 'Post deleted successfully',
      postId,
    };
  }

  @Patch(':id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('id') postId: string, @Request() req: any) {
    console.log('\n❤️ [PostsController] ============ TOGGLE LIKE ============');
    console.log('❤️ [PostsController] Post ID:', postId);
    console.log('❤️ [PostsController] User ID:', req.user?.userId);

    const result = await this.postsService.toggleLike(postId, req.user.userId);

    console.log('✅ [PostsController] Like toggled:', result.isLiked);
    console.log('✅ [PostsController] Likes count:', result.likesCount);

    return result;
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
