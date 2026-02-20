import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { RecipesService } from '../modules/recipes/recipes.service';
import { PostsService } from '../modules/posts/posts.service';
import * as bcrypt from 'bcrypt';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

async function bootstrap() {
  let app;
  try {
    console.log('🌱 Starting database seeding...');
  
    // Debug: Show what we're connecting to
    console.log('📍 MONGODB_URL:', process.env.MONGODB_URL);
    console.log('📍 MONGODB_NAME:', process.env.MONGODB_NAME);
    
    app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get(getConnectionToken()) as Connection;
  
    // Debug: Show actual connection
    console.log('📍 Connected to host:', connection.host);
    console.log('📍 Connected to database:', connection.name);
    console.log('📍 Connection ready state:', connection.readyState); // 1 = connected

    const usersService = app.get(UsersService);
    const recipesService = app.get(RecipesService);
    const postsService = app.get(PostsService);

    // Clear existing data (optional - comment out if you want to keep existing data)
    // eslint-disable-next-line no-console
    console.log('⚠️  Clearing existing data...');
    // Note: You might want to add clear methods to services or use Mongoose directly

    // Seed Users (aligned with standalone seed: 6 users, nested subscription)
    // eslint-disable-next-line no-console
    console.log('👤 Seeding users...');

    const usersData = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'password123',
        subscription: {
          isPremium: true,
          tier: 'premium',
          startDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          status: 'active' as const,
          paymentMethod: 'paymongo',
        },
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'password123',
        subscription: undefined,
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        password: 'password123',
        subscription: {
          isPremium: true,
          tier: 'premium',
          startDate: new Date('2024-02-15'),
          expiryDate: new Date('2025-02-15'),
          status: 'active' as const,
          paymentMethod: 'gcash',
        },
      },
      {
        name: 'Diana Prince',
        email: 'diana@example.com',
        password: 'password123',
        subscription: undefined,
      },
      {
        name: 'Edward Norton',
        email: 'edward@example.com',
        password: 'password123',
        subscription: {
          isPremium: true,
          tier: 'pro',
          startDate: new Date('2024-01-10'),
          expiryDate: new Date('2025-01-10'),
          status: 'active' as const,
          paymentMethod: 'paymongo',
        },
      },
      {
        name: 'Frank Ocean',
        email: 'frank@example.com',
        password: 'password123',
        subscription: {
          isPremium: true,
          tier: 'premium',
          startDate: new Date('2024-03-01'),
          expiryDate: new Date('2025-03-01'),
          status: 'active' as const,
          paymentMethod: 'paymongo',
        },
      },
    ];

    const users: any[] = [];
    for (const u of usersData) {
      const existing = await usersService.findByEmail(u.email);
      if (!existing) {
        const created = await usersService.create(u.name, u.email, u.password, u.subscription);
        users.push(created);
        // eslint-disable-next-line no-console
        console.log(
          `✅ Created user: ${created.name} (ID: ${(created as any)._id})${u.subscription?.isPremium ? ' [Premium]' : ''}`,
        );
      } else {
        users.push(existing);
        // eslint-disable-next-line no-console
        console.log(`ℹ️  User already exists: ${existing.name}`);
      }
    }

    const userId1 = (users[0] as any)._id?.toString() ?? (users[0] as any).id;
    const userId2 = (users[1] as any)._id?.toString() ?? (users[1] as any).id;
    const userId3 = (users[2] as any)._id?.toString() ?? (users[2] as any).id;
    const userId4 = (users[3] as any)._id?.toString() ?? (users[3] as any).id;
    const userId5 = (users[4] as any)._id?.toString() ?? (users[4] as any).id;
    const userId6 = (users[5] as any)._id?.toString() ?? (users[5] as any).id;

    // Seed Recipes (one per user, aligned with standalone seed)
    // eslint-disable-next-line no-console
    console.log('🍳 Seeding recipes...');

    const recipesToCreate = [
      {
        ownerId: userId1,
        ownerName: users[0].name,
        title: 'Classic Chocolate Chip Cookies',
        description: "The best chocolate chip cookies you'll ever make!",
        category: 'Dessert',
        prepTime: 15,
        cookTime: 12,
        servings: 24,
        difficulty: 'easy' as const,
        featuredImage: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e',
        isPublic: true,
        featured: true,
        ingredients: [
          '2 1/4 cups all-purpose flour',
          '1 tsp baking soda',
          '1 cup butter, softened',
          '3/4 cup granulated sugar',
          '3/4 cup brown sugar',
          '2 large eggs',
          '2 tsp vanilla extract',
          '2 cups chocolate chips',
        ],
        instructions: [
          'Preheat oven to 375°F (190°C)',
          'Mix flour and baking soda in a bowl',
          'Cream butter and sugars until fluffy',
          'Beat in eggs and vanilla',
          'Gradually blend in flour mixture',
          'Stir in chocolate chips',
          'Drop rounded tablespoons onto ungreased baking sheets',
          'Bake for 9-11 minutes until golden brown',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId2,
        ownerName: users[1].name,
        title: 'Grilled Salmon with Herbs',
        description: 'Perfectly grilled salmon with fresh herbs and lemon.',
        category: 'Main Course',
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        difficulty: 'easy' as const,
        featuredImage: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
        isPublic: true,
        featured: false,
        ingredients: [
          '4 salmon fillets',
          '2 lemons',
          '3 tbsp olive oil',
          '2 cloves garlic, minced',
          'Salt and pepper',
          'Fresh dill',
        ],
        instructions: [
          'Preheat grill to medium-high heat',
          'Mix olive oil, garlic, salt, and pepper',
          'Brush salmon with oil mixture',
          'Grill salmon for 4-5 minutes per side',
          'Squeeze fresh lemon over salmon',
          'Garnish with dill and serve',
        ],
        isFavorite: false,
        rating: 4,
      },
      {
        ownerId: userId3,
        ownerName: users[2].name,
        title: 'Sourdough Bread',
        description: 'Artisan sourdough bread with crispy crust.',
        category: 'Breakfast',
        prepTime: 60,
        cookTime: 45,
        servings: 8,
        difficulty: 'medium' as const,
        featuredImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
        isPublic: true,
        featured: true,
        ingredients: ['flour', 'starter', 'water', 'salt'],
        instructions: ['Mix', 'Proof', 'Bake'],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId4,
        ownerName: users[3].name,
        title: 'Vegan Buddha Bowl',
        description: 'Nutritious and colorful vegan bowl.',
        category: 'Lunch',
        prepTime: 20,
        cookTime: 0,
        servings: 2,
        difficulty: 'easy' as const,
        featuredImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        isPublic: true,
        featured: false,
        ingredients: ['grains', 'veg', 'tofu'],
        instructions: ['Cook grains', 'Assemble'],
        isFavorite: false,
        rating: 4,
      },
      {
        ownerId: userId5,
        ownerName: users[4].name,
        title: 'Beef Wellington',
        description: 'Gordon Ramsay-style Beef Wellington.',
        category: 'Main Course',
        prepTime: 45,
        cookTime: 40,
        servings: 6,
        difficulty: 'hard' as const,
        featuredImage: 'https://images.unsplash.com/photo-1558030006-450675393462',
        isPublic: true,
        featured: true,
        ingredients: ['beef', 'puff pastry', 'mushrooms'],
        instructions: ['Sear', 'Wrap', 'Bake'],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId6,
        ownerName: users[5].name,
        title: 'Fresh Sushi Platter',
        description: 'Authentic Japanese sushi.',
        category: 'Lunch',
        prepTime: 30,
        cookTime: 0,
        servings: 4,
        difficulty: 'medium' as const,
        featuredImage: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        isPublic: true,
        featured: true,
        ingredients: ['rice', 'fish', 'nori', 'wasabi'],
        instructions: ['Prepare rice', 'Slice fish', 'Assemble'],
        isFavorite: false,
        rating: 5,
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;
    const createdRecipes: any[] = [];

    for (const recipeData of recipesToCreate) {
      try {
        const recipe = await recipesService.create(recipeData);
        createdRecipes.push(recipe);
        // eslint-disable-next-line no-console
        console.log(`✅ Created recipe: ${recipe.title}`);
        createdCount++;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`⚠️  Skipped recipe (may already exist): ${recipeData.title}`);
        skippedCount++;
      }
    }

    // Seed Posts (one per user, aligned with standalone seed)
    // eslint-disable-next-line no-console
    console.log('📰 Seeding posts and comments...');

    const recipeIds = createdRecipes.map((r) => (r as any)._id?.toString()).filter(Boolean);

    const postsToCreate = [
      {
        userId: userId1,
        content:
          'Just tried this amazing cookie recipe! Turned out perfect on the first try! 🍪✨',
        recipeId: recipeIds[0],
      },
      {
        userId: userId2,
        content:
          'Grilled salmon for dinner tonight. The herbs made all the difference! 🐟🔥',
        recipeId: recipeIds[1],
      },
      {
        userId: userId3,
        content:
          'My sourdough starter is finally mature enough! Made my first loaf today. 🍞',
        recipeId: recipeIds[2],
      },
      {
        userId: userId4,
        content:
          'Meal prep Sunday! Made these beautiful Buddha bowls for the week. 🥗',
        recipeId: recipeIds[3],
      },
      {
        userId: userId5,
        content:
          "Teaching a masterclass tomorrow on Beef Wellington. Here's a preview! 👨‍🍳",
        recipeId: recipeIds[4],
      },
      {
        userId: userId6,
        content: 'Fresh sushi night! 🍣',
        recipeId: recipeIds[5],
      },
    ];

    const createdPosts: any[] = [];
    for (const postData of postsToCreate) {
      const post = await postsService.create(postData.userId, {
        content: postData.content,
        recipeId: postData.recipeId,
      });
      createdPosts.push(post);
      // eslint-disable-next-line no-console
      console.log(`✅ Created post for ${(post as any).userName}: ${postData.content.slice(0, 40)}...`);
    }

    // Seed some comments on the first post
    if (createdPosts[0]) {
      await postsService.createComment(
        (createdPosts[0] as any)._id.toString(),
        userId2,
        { content: 'Those cookies look delicious! I need to try this recipe. 😍' },
      );
      await postsService.createComment(
        (createdPosts[0] as any)._id.toString(),
        userId3,
        { content: 'Saving this to my favorites. Thanks for sharing!' },
      );
      // eslint-disable-next-line no-console
      console.log('💬 Added comments to the first post');
    }

    // eslint-disable-next-line no-console
    console.log('\n📊 Seed Summary:');
    // eslint-disable-next-line no-console
    console.log('================');
    // eslint-disable-next-line no-console
    console.log(`   Users: ${users.length}`);
    // eslint-disable-next-line no-console
    console.log(
      `   - Premium: ${usersData.filter((u) => u.subscription?.isPremium).length} ⭐`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `   - Free: ${usersData.filter((u) => !u.subscription?.isPremium).length} 🆓`,
    );
    // eslint-disable-next-line no-console
    console.log(`   Recipes created: ${createdCount}`);
    // eslint-disable-next-line no-console
    console.log(`   Recipes skipped: ${skippedCount}`);
    // eslint-disable-next-line no-console
    console.log(`   Posts: ${createdPosts.length}`);
    // eslint-disable-next-line no-console
    console.log('================');
    // eslint-disable-next-line no-console
    console.log('✅ Database seeding completed (users, recipes, posts, comments)!');
    // eslint-disable-next-line no-console
    console.log('\n📝 Test Users (password: password123):');
    // eslint-disable-next-line no-console
    console.log('==============');
    usersData.forEach((u) => {
      const icon = u.subscription?.isPremium ? '⭐' : '🆓';
      const tier = u.subscription?.tier ?? 'free';
      // eslint-disable-next-line no-console
      console.log(`   ${icon} ${u.email} (${tier}) - ${u.name}`);
    });

    await app.close();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error seeding database:', error);
    if (app) {
    await app.close();
    }
    process.exit(1);
  }
}

bootstrap();
