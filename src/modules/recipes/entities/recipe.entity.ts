export class Recipe {
  _id: string;
  userId: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  category: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string;
  isFavorite: boolean;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

