import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Post,
  PostDocument,
  Comment,
  CommentDocument,
} from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RecipesService } from '../recipes/recipes.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly recipesService: RecipesService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const user = await this.usersService.findOne(userId);

    let recipeTitle: string | undefined;

    if (createPostDto.recipeId) {
      try {
        const recipe = await this.recipesService.findOne(
          createPostDto.recipeId,
        );
        recipeTitle = (recipe as any).title;
      } catch {
        createPostDto.recipeId = undefined;
      }
    }

    const createdPost = new this.postModel({
      userId,
      userName: user.name,
      content: createPostDto.content,
      recipeId: createPostDto.recipeId,
      recipeTitle,
      imageUrl: createPostDto.imageUrl,
      likes: [],
      likesCount: 0,
      commentsCount: 0,
    });

    return createdPost.save();
  }

  /**
   * Get paginated posts with author info and current user's like status.
   */
  async getPosts(
    page: number = 1,
    limit: number = 5,
    userId: string,
  ): Promise<{
    posts: any[];
    hasMore: boolean;
    page: number;
    totalCount: number;
  }> {
    console.log('💾 [PostsService] Fetching posts');
    console.log('💾 [PostsService] Page:', page, 'Limit:', limit);
    console.log('💾 [PostsService] User ID:', userId);

    const skip = (page - 1) * limit;

    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    console.log('💾 [PostsService] Found', postsToReturn.length, 'posts');
    console.log('💾 [PostsService] Has more:', hasMore);

    const enriched = await this.enrichPostsWithAuthor(
      postsToReturn as (Post & { _id: any; userId: string; userName: string })[],
    );

    const postsWithLikeStatus = enriched.map((p, i) => {
      const raw = postsToReturn[i] as any;
      const likes = raw?.likes ?? [];
      const isLiked =
        Array.isArray(likes) && userId
          ? likes.some((id: string) => String(id) === String(userId))
          : false;
      return {
        ...p,
        id: (p as any)._id?.toString?.() ?? (p as any).id,
        likesCount: raw?.likesCount ?? 0,
        commentsCount: raw?.commentsCount ?? 0,
        isLiked,
      };
    });

    const totalCount = await this.postModel.countDocuments().exec();

    return {
      posts: postsWithLikeStatus,
      hasMore,
      page,
      totalCount,
    };
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.postModel.countDocuments().exec(),
    ]);

    const enrichedPosts = await this.enrichPostsWithAuthor(
      posts as (Post & { _id: any; userId: string; userName: string })[],
    );

    return {
      posts: enrichedPosts,
      total,
      hasMore: skip + posts.length < total,
    };
  }

  async findByUser(userId: string): Promise<Post[]> {
    const posts = await this.postModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.enrichPostsWithAuthor(
      posts as (Post & { _id: any; userId: string; userName: string })[],
    );
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  /** Get a single post with author info (for API responses) */
  async findOneWithAuthor(id: string) {
    const post = await this.postModel.findById(id).lean().exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const [enriched] = await this.enrichPostsWithAuthor([
      post as Post & { _id: any; userId: string; userName: string },
    ]);
    return enriched;
  }

  /**
   * Update post content (edit). Only the owner can update.
   * Returns enriched post with author and isLiked for the current user.
   */
  async updatePost(
    postId: string,
    userId: string,
    content: string,
  ): Promise<any> {
    console.log('💾 [PostsService] Updating post:', postId);
    console.log('💾 [PostsService] User:', userId);

    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      console.error('❌ [PostsService] Post not found');
      throw new NotFoundException('Post not found');
    }

    const postUserId =
      typeof (post as any).userId === 'string'
        ? (post as any).userId
        : String((post as any).userId);
    if (postUserId !== userId) {
      console.error(
        '❌ [PostsService] User not authorized to edit this post',
      );
      throw new ForbiddenException(
        'You are not authorized to edit this post',
      );
    }

    (post as any).content = content;
    await (post as any).save();

    console.log('✅ [PostsService] Post updated successfully');

    const enriched = await this.findOneWithAuthor(postId);
    const raw = await this.postModel.findById(postId).lean().exec();
    const likes = (raw as any)?.likes ?? [];
    const isLiked =
      Array.isArray(likes) &&
      likes.some((id: string) => String(id) === String(userId));

    return {
      ...enriched,
      id: (enriched as any)._id?.toString?.() ?? (enriched as any).id ?? postId,
      likesCount: (raw as any)?.likesCount ?? 0,
      commentsCount: (raw as any)?.commentsCount ?? 0,
      isLiked,
    };
  }

  /**
   * Delete a post. Only the owner can delete. Also deletes associated comments.
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    console.log('💾 [PostsService] Deleting post:', postId);
    console.log('💾 [PostsService] User:', userId);

    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      console.error('❌ [PostsService] Post not found');
      throw new NotFoundException('Post not found');
    }

    const postUserId =
      typeof (post as any).userId === 'string'
        ? (post as any).userId
        : String((post as any).userId);
    if (postUserId !== userId) {
      console.error(
        '❌ [PostsService] User not authorized to delete this post',
      );
      throw new ForbiddenException(
        'You are not authorized to delete this post',
      );
    }

    await this.commentModel.deleteMany({ postId }).exec();
    await this.postModel.deleteOne({ _id: postId }).exec();

    console.log('✅ [PostsService] Post deleted successfully');
  }

  async update(
    id: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post> {
    const post = await this.findOne(id);

    if ((post as any).userId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    if (updatePostDto.recipeId && updatePostDto.recipeId !== post.recipeId) {
      try {
        const recipe = await this.recipesService.findOne(
          updatePostDto.recipeId,
        );
        (post as any).recipeTitle = (recipe as any).title;
      } catch {
        updatePostDto.recipeId = undefined;
        (post as any).recipeTitle = undefined;
      }
    }

    Object.assign(post as any, {
      ...updatePostDto,
    });

    await (post as any).save();
    return post;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.deletePost(id, userId);
  }

  async toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ postId: string; likesCount: number; isLiked: boolean }> {
    console.log('💾 [PostsService] Toggling like');
    console.log('💾 [PostsService] Post ID:', postId);
    console.log('💾 [PostsService] User ID:', userId);

    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const likes: string[] = Array.isArray((post as any).likes)
      ? (post as any).likes.map((id: any) => String(id))
      : [];
    const userIdStr = String(userId);
    const likeIndex = likes.findIndex((id) => id === userIdStr);

    let isLiked: boolean;

    if (likeIndex > -1) {
      likes.splice(likeIndex, 1);
      (post as any).likes = likes;
      (post as any).likesCount = Math.max(0, (post as any).likesCount - 1);
      isLiked = false;
      console.log('💾 [PostsService] Like removed');
    } else {
      likes.push(userIdStr);
      (post as any).likes = likes;
      (post as any).likesCount = ((post as any).likesCount || 0) + 1;
      isLiked = true;
      console.log('💾 [PostsService] Like added');
    }

    await (post as any).save();

    console.log('✅ [PostsService] Post saved');
    console.log('✅ [PostsService] New likes count:', (post as any).likesCount);
    console.log('✅ [PostsService] Is liked:', isLiked);

    return {
      postId: (post as any)._id.toString(),
      likesCount: (post as any).likesCount,
      isLiked,
    };
  }

  async createComment(
    postId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const post = await this.findOne(postId);
    const user = await this.usersService.findOne(userId);

    const createdComment = new this.commentModel({
      postId,
      userId,
      userName: user.name,
      content: createCommentDto.content,
    });

    const comment = await createdComment.save();

    (post as any).commentsCount += 1;
    await (post as any).save();

    return comment;
  }

  async getComments(postId: string): Promise<Comment[]> {
    await this.findOne(postId);

    return this.commentModel.find({ postId }).sort({ createdAt: 1 }).exec();
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentModel.findById(commentId).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentModel.deleteOne({ _id: commentId }).exec();

    const post = await this.findOne(comment.postId);
    const count = await this.commentModel
      .countDocuments({ postId: comment.postId })
      .exec();
    (post as any).commentsCount = count;
    await (post as any).save();
  }

  async getPostsByRecipe(recipeId: string): Promise<Post[]> {
    const posts = await this.postModel
      .find({ recipeId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.enrichPostsWithAuthor(
      posts as (Post & { _id: any; userId: string; userName: string })[],
    );
  }

  /** Enrich posts with author object including subscription */
  private async enrichPostsWithAuthor(
    posts: (Post & { _id: any; userId: string; userName: string })[],
  ): Promise<
    (Post & {
      author: {
        _id: string;
        name: string;
        avatarUrl?: string | null;
        subscription: {
          isPremium: boolean;
          tier: string;
          status?: string;
          startDate?: Date;
          expiryDate?: Date;
          paymentMethod?: string;
          subscriptionId?: string;
        };
      };
    })[]
  > {
    if (posts.length === 0) return [];
    const userIds = [...new Set(posts.map((p) => p.userId))];
    const userMap = new Map<
      string,
      {
        _id: string;
        name: string;
        avatarUrl?: string | null;
        subscription: {
          isPremium: boolean;
          tier: string;
          status?: string;
          startDate?: Date;
          expiryDate?: Date;
          paymentMethod?: string;
          subscriptionId?: string;
        };
      }
    >();
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const user = await this.usersService.findOne(uid);
          const doc = (user as any).toObject ? (user as any).toObject() : user;
          // Handle nested subscription or fallback to old schema
          const subscription = doc.subscription
            ? {
                isPremium: doc.subscription.isPremium ?? false,
                tier: doc.subscription.tier ?? 'free',
                status: doc.subscription.status ?? 'active',
                startDate: doc.subscription.startDate,
                expiryDate: doc.subscription.expiryDate,
                paymentMethod: doc.subscription.paymentMethod,
                subscriptionId: doc.subscription.subscriptionId,
              }
            : {
                isPremium: doc.isPremium ?? false,
                tier: doc.subscriptionTier ?? 'free',
                status: 'active',
              };
          userMap.set(uid, {
            _id: uid,
            name: doc.name,
            avatarUrl: doc.avatarUrl ?? null,
            subscription,
          });
        } catch {
          userMap.set(uid, {
            _id: uid,
            name:
              posts.find((p) => p.userId === uid)?.userName ?? 'Unknown User',
            avatarUrl: null,
            subscription: {
              isPremium: false,
              tier: 'free',
              status: 'active',
            },
          });
        }
      }),
    );
    return posts.map((p) => {
      const author = userMap.get(p.userId)!;
      return {
        ...p,
        author: {
          _id: author._id,
          name: author.name,
          avatarUrl: author.avatarUrl,
          subscription: author.subscription,
        },
      };
    });
  }
}
