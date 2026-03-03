import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: 'paymongo' })
  provider: string;

  @Prop()
  checkoutSessionId?: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'PHP' })
  currency: string;

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired'],
    default: 'pending',
  })
  status: 'pending' | 'paid' | 'failed' | 'expired';

  @Prop({ required: true, default: 'subscription' })
  purpose: string;

  @Prop({ type: Date })
  paidAt?: Date;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ checkoutSessionId: 1 });

