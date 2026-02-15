import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':userId')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('userId') userId: string, @Request() req: any) {
    const follow = await this.followsService.follow(req.user.userId, userId);
    return {
      success: true,
      message: 'Successfully followed user',
      data: follow,
    };
  }

  @Delete(':userId')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('userId') userId: string, @Request() req: any) {
    await this.followsService.unfollow(req.user.userId, userId);
    return {
      success: true,
      message: 'Successfully unfollowed user',
    };
  }

  @Get('check/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async checkFollowing(@Param('userId') userId: string, @Request() req: any) {
    // If no user is authenticated, they're not following anyone
    if (!req.user || !req.user.userId) {
      return {
        success: true,
        data: { isFollowing: false },
      };
    }

    const isFollowing = await this.followsService.isFollowing(
      req.user.userId,
      userId,
    );
    return {
      success: true,
      data: { isFollowing },
    };
  }

  @Get('followers/:userId')
  async getFollowers(@Param('userId') userId: string) {
    const followers = await this.followsService.getFollowers(userId);
    return {
      success: true,
      data: followers,
    };
  }

  @Get('following/:userId')
  async getFollowing(@Param('userId') userId: string) {
    const following = await this.followsService.getFollowing(userId);
    return {
      success: true,
      data: following,
    };
  }

  @Get('stats/:userId')
  async getStats(@Param('userId') userId: string) {
    const stats = await this.followsService.getStats(userId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('mutual/:userId')
  @UseGuards(JwtAuthGuard)
  async checkMutual(@Param('userId') userId: string, @Request() req: any) {
    const isMutual = await this.followsService.getMutualFollows(
      req.user.userId,
      userId,
    );
    return {
      success: true,
      data: { isMutual },
    };
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  async getSuggestedUsers(@Request() req: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const suggestions = await this.followsService.getSuggestedUsers(
      req.user.userId,
      limitNum,
    );
    return {
      success: true,
      data: suggestions,
    };
  }

  @Get('my-followers')
  @UseGuards(JwtAuthGuard)
  async getMyFollowers(@Request() req: any) {
    const followers = await this.followsService.getFollowers(req.user.userId);
    return {
      success: true,
      data: followers,
    };
  }

  @Get('my-following')
  @UseGuards(JwtAuthGuard)
  async getMyFollowing(@Request() req: any) {
    const following = await this.followsService.getFollowing(req.user.userId);
    return {
      success: true,
      data: following,
    };
  }

  @Post('block/:userId')
  @UseGuards(JwtAuthGuard)
  async blockUser(@Param('userId') userId: string, @Request() req: any) {
    const result = await this.followsService.blockUser(req.user.userId, userId);
    return { success: true, message: 'User blocked', data: result };
  }

  @Delete('block/:userId')
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Param('userId') userId: string, @Request() req: any) {
    await this.followsService.unblockUser(req.user.userId, userId);
    return { success: true, message: 'User unblocked' };
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  async getBlockedUsers(@Request() req: any) {
    const list = await this.followsService.getBlockedUsers(req.user.userId);
    return { success: true, data: list };
  }
}
