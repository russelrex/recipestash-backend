import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string; // Hashed password

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  bio?: string;

  @Prop()
  avatarUrl?: string; // public S3 URL
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
