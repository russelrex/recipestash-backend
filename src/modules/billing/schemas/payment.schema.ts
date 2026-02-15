import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 'paymongo' })
  provider: string;

  @Prop({ unique: true, sparse: true })
  checkoutSessionId: string;

  @Prop()
  paymentIntentId: string;

  @Prop({ required: true })
  amount: number; // in centavos

  @Prop({ default: 'PHP' })
  currency: string;

  @Prop({ default: 'pending', enum: ['pending', 'paid', 'failed', 'expired'] })
  status: string;

  @Prop({ default: 'subscription_monthly' })
  purpose: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  paidAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
