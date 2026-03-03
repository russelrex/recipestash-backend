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
  profilePicture?: string;

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

  @Prop({ type: String, enum: ['free', 'premium'], default: 'free' })
  plan: 'free' | 'premium';

  @Prop()
  subscriptionEndsAt?: Date;

  @Prop({
    type: String,
    enum: ['active', 'expiring_soon', 'expired', 'inactive'],
    default: 'inactive',
  })
  subscriptionStatus: 'active' | 'expiring_soon' | 'expired' | 'inactive';

  @Prop()
  customerId?: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ plan: 1 });
UserSchema.index({ subscriptionStatus: 1 });
