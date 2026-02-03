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

  @Prop({ default: true })
  notificationsEnabled?: boolean;

  @Prop({ type: [String], default: [] })
  dietaryRestrictions?: string[];

  @Prop({ enum: ['metric', 'imperial'], default: 'metric' })
  measurementUnit?: 'metric' | 'imperial';

  @Prop({ default: true })
  privacyProfilePublic?: boolean;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
