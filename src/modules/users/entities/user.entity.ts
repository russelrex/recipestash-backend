import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Subscription subdocument schema
@Schema({ _id: false })
export class Subscription {
  @Prop({ default: false })
  isPremium: boolean;

  @Prop({ type: String, enum: ['free', 'premium', 'pro'], default: 'free' })
  tier: string;

  @Prop()
  startDate?: Date;

  @Prop()
  expiryDate?: Date;

  @Prop({
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
  })
  status?: string;

  @Prop()
  paymentMethod?: string; // 'paymongo', 'gcash', etc.

  @Prop()
  subscriptionId?: string; // External subscription ID
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

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

  // NESTED SUBSCRIPTION OBJECT
  @Prop({ type: SubscriptionSchema, default: () => ({}) })
  subscription: Subscription;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'subscription.isPremium': 1 });
UserSchema.index({ 'subscription.tier': 1 });
