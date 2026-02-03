import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Recipe {
  @Prop({ required: true })
  ownerId: string;

  @Prop({ required: true })
  ownerName: string;

  @Prop()
  userId?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  ingredients: string[];

  @Prop({ type: [String], default: [] })
  instructions: string[];

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  prepTime: number;

  @Prop({ required: true })
  cookTime: number;

  @Prop({ required: true })
  servings: number;

  @Prop({ enum: ['easy', 'medium', 'hard'], required: true })
  difficulty: 'easy' | 'medium' | 'hard';

  @Prop()
  featuredImage?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ default: false })
  isFavorite: boolean;

  @Prop({ default: false })
  featured: boolean;

  @Prop()
  rating?: number;
}

export type RecipeDocument = Recipe & Document;
export const RecipeSchema = SchemaFactory.createForClass(Recipe);

