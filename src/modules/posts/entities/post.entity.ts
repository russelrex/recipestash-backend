import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string; // denormalized for faster queries

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop()
  recipeId?: string;

  @Prop()
  recipeTitle?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: [String], default: [] })
  likes: string[];

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;
}

export type PostDocument = Post & Document;
export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ likes: 1 });

@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, maxlength: 500 })
  content: string;
}

export type CommentDocument = Comment & Document;
export const CommentSchema = SchemaFactory.createForClass(Comment);
