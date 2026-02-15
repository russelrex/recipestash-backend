import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Follow {
  @Prop({ required: true, index: true })
  followerId: string; // User who is following

  @Prop({ required: true })
  followerName: string; // Denormalized for faster queries

  @Prop({ required: true, index: true })
  followingId: string; // User being followed

  @Prop({ required: true })
  followingName: string; // Denormalized for faster queries
}

export type FollowDocument = Follow & Document;
export const FollowSchema = SchemaFactory.createForClass(Follow);
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export class FollowStats {
  userId: string;
  followersCount: number;
  followingCount: number;
}
