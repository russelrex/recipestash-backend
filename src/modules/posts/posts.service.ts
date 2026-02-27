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
    const post = await this.findOne(id);

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.deleteOne({ _id: id }).exec();
    await this.commentModel.deleteMany({ postId: id }).exec();
  }

  async toggleLike(postId: string, userId: string): Promise<Post> {
    const post = await this.findOne(postId);

    const likeIndex = (post as any).likes.indexOf(userId);

    if (likeIndex > -1) {
      (post as any).likes.splice(likeIndex, 1);
    } else {
      (post as any).likes.push(userId);
    }

    (post as any).likesCount = (post as any).likes.length;
    await (post as any).save();
    return post as any;
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
