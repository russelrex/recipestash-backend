import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Follow, FollowDocument, FollowStats } from './entities/follow.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(Follow.name)
    private readonly followModel: Model<FollowDocument>,
    private readonly usersService: UsersService,
  ) {}

  async follow(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new ConflictException('You cannot follow yourself');
    }

    const [follower, following] = await Promise.all([
      this.usersService.findOne(followerId),
      this.usersService.findOne(followingId),
    ]);

    try {
      const follow = new this.followModel({
        followerId,
        followerName: follower.name,
        followingId,
        followingName: following.name,
      });
      return await follow.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('You are already following this user');
      }
      throw err;
    }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const res = await this.followModel
      .deleteOne({ followerId, followingId })
      .exec();
    if (!res.deletedCount) {
      throw new NotFoundException('Follow relationship not found');
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.followModel
      .countDocuments({ followerId, followingId })
      .exec();
    return count > 0;
  }

  async getFollowers(userId: string): Promise<Follow[]> {
    // Users who follow this user
    return this.followModel
      .find({ followingId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getFollowing(userId: string): Promise<Follow[]> {
    // Users this user follows
    return this.followModel
      .find({ followerId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const docs = await this.followModel
      .find({ followerId: userId })
      .select({ followingId: 1, _id: 0 })
      .exec();
    return docs.map((d: any) => d.followingId);
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const docs = await this.followModel
      .find({ followingId: userId })
      .select({ followerId: 1, _id: 0 })
      .exec();
    return docs.map((d: any) => d.followerId);
  }

  async getStats(userId: string): Promise<FollowStats> {
    const [followersCount, followingCount] = await Promise.all([
      this.followModel.countDocuments({ followingId: userId }).exec(),
      this.followModel.countDocuments({ followerId: userId }).exec(),
    ]);

    return {
      userId,
      followersCount,
      followingCount,
    };
  }

  async getMutualFollows(userId: string, otherUserId: string): Promise<boolean> {
    const [a, b] = await Promise.all([
      this.isFollowing(userId, otherUserId),
      this.isFollowing(otherUserId, userId),
    ]);
    return a && b;
  }

  async getSuggestedUsers(
    userId: string,
    limit = 10,
  ): Promise<Array<Record<string, any>>> {
    const followingIds = await this.getFollowingIds(userId);
    if (followingIds.length === 0) return [];

    // Get "second-degree" follows: who your followings follow
    const secondDegree = await this.followModel
      .find({ followerId: { $in: followingIds } })
      .select({ followingId: 1, _id: 0 })
      .exec();

    const counts = new Map<string, number>();
    for (const d of secondDegree as any[]) {
      const suggestedId = d.followingId;
      if (suggestedId === userId) continue;
      if (followingIds.includes(suggestedId)) continue;
      counts.set(suggestedId, (counts.get(suggestedId) ?? 0) + 1);
    }

    const sortedIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    const suggestedUsers = await Promise.all(
      sortedIds.map(async (id) => {
        const user = await this.usersService.findOne(id);
        const stats = await this.getStats(id);
        return {
          ...this.usersService.sanitizeUser(user),
          ...stats,
          mutualConnections: counts.get(id) ?? 0,
        };
      }),
    );

    return suggestedUsers;
  }
}

