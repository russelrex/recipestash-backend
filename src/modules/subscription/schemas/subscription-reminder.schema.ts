import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionReminderDocument = SubscriptionReminder & Document;

@Schema({ timestamps: true })
export class SubscriptionReminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['7_days', '1_day'] })
  type: string;

  @Prop({ required: true })
  subscriptionEndsAt: Date;

  @Prop({ default: Date.now })
  sentAt: Date;
}

export const SubscriptionReminderSchema =
  SchemaFactory.createForClass(SubscriptionReminder);
