import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { RecipesService } from '../modules/recipes/recipes.service';
import { PostsService } from '../modules/posts/posts.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const recipesService = app.get(RecipesService);
  const postsService = app.get(PostsService);

  try {
    // eslint-disable-next-line no-console
    console.log('🌱 Starting database seed...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // eslint-disable-next-line no-console
    console.log('⚠️  Clearing existing data...');
    // Note: You might want to add clear methods to services or use Mongoose directly

    // Seed Users
    // eslint-disable-next-line no-console
    console.log('👤 Seeding users...');

    const user1Data = {
      name: 'Alice',
    };
    const user2Data = {
      name: 'Bob',
    };
    const user3Data = {
      name: 'Charlie',
    };

    let user1, user2, user3;

    // Check if users already exist
    const existingUser1 = await usersService.findByName(user1Data.name);
    const existingUser2 = await usersService.findByName(user2Data.name);
    const existingUser3 = await usersService.findByName(user3Data.name);

    if (!existingUser1) {
      user1 = await usersService.create(user1Data);
      // eslint-disable-next-line no-console
      console.log(`✅ Created user: ${user1.name} (ID: ${(user1 as any)._id})`);
    } else {
      user1 = existingUser1;
      // eslint-disable-next-line no-console
      console.log(`ℹ️  User already exists: ${user1.name}`);
    }

    if (!existingUser2) {
      user2 = await usersService.create(user2Data);
      // eslint-disable-next-line no-console
      console.log(`✅ Created user: ${user2.name} (ID: ${(user2 as any)._id})`);
    } else {
      user2 = existingUser2;
      // eslint-disable-next-line no-console
      console.log(`ℹ️  User already exists: ${user2.name}`);
    }

    if (!existingUser3) {
      user3 = await usersService.create(user3Data);
      // eslint-disable-next-line no-console
      console.log(`✅ Created user: ${user3.name} (ID: ${(user3 as any)._id})`);
    } else {
      user3 = existingUser3;
      // eslint-disable-next-line no-console
      console.log(`ℹ️  User already exists: ${user3.name}`);
    }

    const userId1 = (user1 as any)._id?.toString() ?? (user1 as any).id;
    const userId2 = (user2 as any)._id?.toString() ?? (user2 as any).id;
    const userId3 = (user3 as any)._id?.toString() ?? (user3 as any).id;

    // Seed Recipes
    // eslint-disable-next-line no-console
    console.log('🍳 Seeding recipes...');

    const recipes = [
      // User 1 Recipes
      {
        userId: userId1,
        title: 'Classic Chocolate Chip Cookies',
        description: 'Soft and chewy chocolate chip cookies that are perfect for any occasion.',
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
        category: 'Dessert',
        prepTime: 15,
        cookTime: 11,
        servings: 24,
        difficulty: 'easy' as const,
        isFavorite: true,
        rating: 5,
      },
      {
        userId: userId1,
        title: 'Spaghetti Carbonara',
        description: 'Creamy Italian pasta dish with bacon and parmesan cheese.',
        ingredients: [
          '1 lb spaghetti',
          '8 oz bacon, diced',
          '4 large eggs',
          '1 cup grated parmesan cheese',
          '1/2 cup heavy cream',
          'Salt and pepper to taste',
          'Fresh parsley for garnish',
        ],
        instructions: [
          'Cook spaghetti according to package directions',
          'Cook bacon in a large pan until crispy',
          'Whisk eggs, parmesan, and cream in a bowl',
          'Drain pasta and add to bacon pan',
          'Remove from heat and quickly stir in egg mixture',
          'Season with salt and pepper',
          'Garnish with parsley and serve immediately',
        ],
        category: 'Main Course',
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        difficulty: 'medium' as const,
        isFavorite: true,
        rating: 5,
      },
      // User 2 Recipes
      {
        userId: userId2,
        title: 'Grilled Salmon with Lemon',
        description: 'Healthy and flavorful grilled salmon with fresh lemon.',
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
        category: 'Main Course',
        prepTime: 10,
        cookTime: 10,
        servings: 4,
        difficulty: 'easy' as const,
        isFavorite: false,
        rating: 4,
      },
      {
        userId: userId2,
        title: 'Caesar Salad',
        description: 'Classic Caesar salad with homemade dressing.',
        ingredients: [
          '1 head romaine lettuce',
          '1/2 cup parmesan cheese',
          '1/2 cup croutons',
          '2 anchovy fillets',
          '2 cloves garlic',
          '1/4 cup olive oil',
          '2 tbsp lemon juice',
          '1 egg yolk',
        ],
        instructions: [
          'Wash and chop romaine lettuce',
          'Make dressing by blending anchovies, garlic, oil, lemon, and egg yolk',
          'Toss lettuce with dressing',
          'Add parmesan and croutons',
          'Serve immediately',
        ],
        category: 'Salad',
        prepTime: 15,
        cookTime: 0,
        servings: 4,
        difficulty: 'easy' as const,
        isFavorite: true,
        rating: 4,
      },
      // User 3 Recipes
      {
        userId: userId3,
        title: 'Beef Wellington',
        description: 'Elegant beef tenderloin wrapped in puff pastry.',
        ingredients: [
          '2 lb beef tenderloin',
          '1 lb puff pastry',
          '8 oz mushrooms',
          '2 tbsp pâté',
          'Prosciutto slices',
          '1 egg for egg wash',
          'Salt and pepper',
        ],
        instructions: [
          'Season and sear beef tenderloin',
          'Sauté mushrooms until dry',
          'Roll out puff pastry',
          'Layer prosciutto and pâté on pastry',
          'Place beef on top and wrap tightly',
          'Brush with egg wash',
          'Bake at 400°F for 25-30 minutes',
          'Rest before slicing',
        ],
        category: 'Main Course',
        prepTime: 45,
        cookTime: 30,
        servings: 6,
        difficulty: 'hard' as const,
        isFavorite: true,
        rating: 5,
      },
      {
        userId: userId3,
        title: 'Tiramisu',
        description: 'Classic Italian dessert with coffee and mascarpone.',
        ingredients: [
          '6 egg yolks',
          '3/4 cup sugar',
          '1 lb mascarpone cheese',
          '1 1/4 cups heavy cream',
          '2 cups strong coffee',
          'Ladyfinger cookies',
          'Cocoa powder',
        ],
        instructions: [
          'Beat egg yolks and sugar until thick',
          'Fold in mascarpone',
          'Whip cream and fold into mixture',
          'Dip ladyfingers in coffee',
          'Layer ladyfingers and cream mixture',
          'Dust with cocoa powder',
          'Chill for at least 4 hours',
        ],
        category: 'Dessert',
        prepTime: 30,
        cookTime: 0,
        servings: 8,
        difficulty: 'medium' as const,
        isFavorite: true,
        rating: 5,
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const recipeData of recipes) {
      try {
        const recipe = await recipesService.create(recipeData);
        // eslint-disable-next-line no-console
        console.log(`✅ Created recipe: ${recipe.title}`);
        createdCount++;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`⚠️  Skipped recipe (may already exist): ${recipeData.title}`);
        skippedCount++;
      }
    }

    // Seed Posts / Newsfeed
    // eslint-disable-next-line no-console
    console.log('📰 Seeding posts and comments...');

    const aliceRecipes = await recipesService.findAll(userId1);
    const bobRecipes = await recipesService.findAll(userId2);

    const aliceFirstRecipe = aliceRecipes[0];
    const bobFirstRecipe = bobRecipes[0];

    const postsToCreate = [
      {
        userId: userId1,
        content: 'Just baked these amazing chocolate chip cookies from my saved recipe! 🍪',
        recipeId: aliceFirstRecipe ? (aliceFirstRecipe as any)._id?.toString() : undefined,
      },
      {
        userId: userId1,
        content: 'Carbonara night! This recipe is a keeper. 😋',
        recipeId: aliceFirstRecipe ? (aliceFirstRecipe as any)._id?.toString() : undefined,
      },
      {
        userId: userId2,
        content: 'Grilled salmon turned out perfect on the first try! 🐟🔥',
        recipeId: bobFirstRecipe ? (bobFirstRecipe as any)._id?.toString() : undefined,
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
      console.log(`✅ Created post for user ${post.userName}: ${post.content}`);
    }

    // Seed some comments on the first post
    if (createdPosts[0]) {
      await postsService.createComment((createdPosts[0] as any)._id.toString(), userId2, {
        content: 'Those cookies look delicious! I need to try this recipe. 😍',
      });
      await postsService.createComment((createdPosts[0] as any)._id.toString(), userId3, {
        content: 'Saving this to my favorites. Thanks for sharing!',
      });
      // eslint-disable-next-line no-console
      console.log('💬 Added comments to the first post');
    }

    // eslint-disable-next-line no-console
    console.log('\n📊 Seed Summary:');
    // eslint-disable-next-line no-console
    console.log(`   Recipes created: ${createdCount}`);
    // eslint-disable-next-line no-console
    console.log(`   Recipes skipped: ${skippedCount}`);
    // eslint-disable-next-line no-console
    console.log('✅ Database seeding completed (users, recipes, posts, comments)!');

    await app.close();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error seeding database:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
