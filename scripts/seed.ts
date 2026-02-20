import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('🌱 Starting database seed...');

  const uri = process.env.MONGODB_URL;
  if (!uri) {
    console.error('❌ MONGODB_URL is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const dbName = process.env.MONGODB_NAME || undefined;
    const db = dbName ? client.db(dbName) : client.db();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('recipes').deleteMany({});
    await db.collection('posts').deleteMany({});
    await db.collection('comments').deleteMany({});

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // ============================================
    // CREATE USERS WITH NESTED SUBSCRIPTION
    // ============================================

    console.log('👥 Creating users...');

    const users = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: hashedPassword,
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
        bio: 'Home chef and food blogger. Love experimenting!',
        subscription: {
          isPremium: true,
          tier: 'premium',
          status: 'active',
          startDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          paymentMethod: 'paymongo',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: hashedPassword,
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
        bio: 'BBQ master and grilling enthusiast.',
        subscription: {
          isPremium: false,
          tier: 'free',
          status: 'active',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        password: hashedPassword,
        avatarUrl: 'https://i.pravatar.cc/150?img=3',
        bio: 'Baker specializing in sourdough.',
        subscription: {
          isPremium: true,
          tier: 'premium',
          status: 'active',
          startDate: new Date('2024-02-15'),
          expiryDate: new Date('2025-02-15'),
          paymentMethod: 'gcash',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Diana Prince',
        email: 'diana@example.com',
        password: hashedPassword,
        avatarUrl: 'https://i.pravatar.cc/150?img=4',
        bio: 'Vegan chef and nutrition consultant.',
        subscription: {
          isPremium: false,
          tier: 'free',
          status: 'active',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Edward Norton',
        email: 'edward@example.com',
        password: hashedPassword,
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
        bio: 'Professional chef with 15 years experience.',
        subscription: {
          isPremium: true,
          tier: 'pro',
          status: 'active',
          startDate: new Date('2024-01-10'),
          expiryDate: new Date('2025-01-10'),
          paymentMethod: 'paymongo',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Frank Ocean',
        email: 'frank@example.com',
        password: hashedPassword,
        avatarUrl: 'https://i.pravatar.cc/150?img=6',
        bio: 'Seafood specialist and sushi chef.',
        subscription: {
          isPremium: true,
          tier: 'premium',
          status: 'active',
          startDate: new Date('2024-03-01'),
          expiryDate: new Date('2025-03-01'),
          paymentMethod: 'paymongo',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const usersResult = await db.collection('users').insertMany(users);
    const userIds = Object.values(usersResult.insertedIds);

    console.log(`✅ Created ${userIds.length} users`);
    console.log(
      `   - Premium: ${users.filter((u) => u.subscription.isPremium).length} ⭐`,
    );
    console.log(
      `   - Free: ${users.filter((u) => !u.subscription.isPremium).length} 🆓`,
    );

    // ============================================
    // CREATE RECIPES
    // ============================================

    console.log('🍳 Creating recipes...');

    const recipes = [
      {
        title: 'Classic Chocolate Chip Cookies',
        description:
          "The best chocolate chip cookies you'll ever make!",
        category: 'Dessert',
        prepTime: 15,
        cookTime: 12,
        servings: 24,
        difficulty: 'easy' as const,
        ownerId: userIds[0].toString(),
        ownerName: users[0].name,
        featuredImage:
          'https://images.unsplash.com/photo-1499636136210-6f4ee915583e',
        isPublic: true,
        featured: true,
        ingredients: ['flour', 'butter', 'sugar', 'chocolate chips'],
        instructions: ['Mix', 'Bake', 'Cool'],
        isFavorite: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      },
      {
        title: 'Grilled Salmon with Herbs',
        description: 'Perfectly grilled salmon with fresh herbs and lemon.',
        category: 'Main Course',
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        difficulty: 'easy' as const,
        ownerId: userIds[1].toString(),
        ownerName: users[1].name,
        featuredImage:
          'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
        isPublic: true,
        featured: false,
        ingredients: ['salmon', 'herbs', 'lemon'],
        instructions: ['Season', 'Grill', 'Serve'],
        isFavorite: false,
        createdAt: new Date('2024-02-05'),
        updatedAt: new Date('2024-02-05'),
      },
      {
        title: 'Sourdough Bread',
        description: 'Artisan sourdough bread with crispy crust.',
        category: 'Breakfast',
        prepTime: 60,
        cookTime: 45,
        servings: 8,
        difficulty: 'medium' as const,
        ownerId: userIds[2].toString(),
        ownerName: users[2].name,
        featuredImage:
          'https://images.unsplash.com/photo-1509440159596-0249088772ff',
        isPublic: true,
        featured: true,
        ingredients: ['flour', 'starter', 'water', 'salt'],
        instructions: ['Mix', 'Proof', 'Bake'],
        isFavorite: false,
        createdAt: new Date('2024-02-08'),
        updatedAt: new Date('2024-02-08'),
      },
      {
        title: 'Vegan Buddha Bowl',
        description: 'Nutritious and colorful vegan bowl.',
        category: 'Lunch',
        prepTime: 20,
        cookTime: 0,
        servings: 2,
        difficulty: 'easy' as const,
        ownerId: userIds[3].toString(),
        ownerName: users[3].name,
        featuredImage:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        isPublic: true,
        featured: false,
        ingredients: ['grains', 'veg', 'tofu'],
        instructions: ['Cook grains', 'Assemble'],
        isFavorite: false,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-10'),
      },
      {
        title: 'Beef Wellington',
        description: 'Gordon Ramsay-style Beef Wellington.',
        category: 'Main Course',
        prepTime: 45,
        cookTime: 40,
        servings: 6,
        difficulty: 'hard' as const,
        ownerId: userIds[4].toString(),
        ownerName: users[4].name,
        featuredImage:
          'https://images.unsplash.com/photo-1558030006-450675393462',
        isPublic: true,
        featured: true,
        ingredients: ['beef', 'puff pastry', 'mushrooms'],
        instructions: ['Sear', 'Wrap', 'Bake'],
        isFavorite: false,
        createdAt: new Date('2024-02-12'),
        updatedAt: new Date('2024-02-12'),
      },
      {
        title: 'Fresh Sushi Platter',
        description: 'Authentic Japanese sushi.',
        category: 'Lunch',
        prepTime: 30,
        cookTime: 0,
        servings: 4,
        difficulty: 'medium' as const,
        ownerId: userIds[5].toString(),
        ownerName: users[5].name,
        featuredImage:
          'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        isPublic: true,
        featured: true,
        ingredients: ['rice', 'fish', 'nori', 'wasabi'],
        instructions: ['Prepare rice', 'Slice fish', 'Assemble'],
        isFavorite: false,
        createdAt: new Date('2024-02-14'),
        updatedAt: new Date('2024-02-14'),
      },
    ];

    const recipesResult = await db.collection('recipes').insertMany(recipes);
    const recipeIds = Object.values(recipesResult.insertedIds);

    console.log(`✅ Created ${recipes.length} recipes`);

    // ============================================
    // CREATE POSTS
    // ============================================

    console.log('📝 Creating posts...');

    const posts = [
      {
        content:
          'Just tried this amazing cookie recipe! Turned out perfect on the first try! 🍪✨',
        userId: userIds[0].toString(),
        userName: users[0].name,
        recipeId: recipeIds[0].toString(),
        recipeTitle: recipes[0].title,
        likes: [],
        likesCount: 15,
        commentsCount: 3,
        createdAt: new Date('2024-02-02'),
        updatedAt: new Date('2024-02-02'),
      },
      {
        content:
          'Grilled salmon for dinner tonight. The herbs made all the difference! 🐟🔥',
        userId: userIds[1].toString(),
        userName: users[1].name,
        recipeId: recipeIds[1].toString(),
        recipeTitle: recipes[1].title,
        likes: [],
        likesCount: 8,
        commentsCount: 2,
        createdAt: new Date('2024-02-06'),
        updatedAt: new Date('2024-02-06'),
      },
      {
        content:
          'My sourdough starter is finally mature enough! Made my first loaf today. 🍞',
        userId: userIds[2].toString(),
        userName: users[2].name,
        recipeId: recipeIds[2].toString(),
        recipeTitle: recipes[2].title,
        likes: [],
        likesCount: 22,
        commentsCount: 5,
        createdAt: new Date('2024-02-09'),
        updatedAt: new Date('2024-02-09'),
      },
      {
        content:
          'Meal prep Sunday! Made these beautiful Buddha bowls for the week. 🥗',
        userId: userIds[3].toString(),
        userName: users[3].name,
        recipeId: recipeIds[3].toString(),
        recipeTitle: recipes[3].title,
        likes: [],
        likesCount: 12,
        commentsCount: 1,
        createdAt: new Date('2024-02-11'),
        updatedAt: new Date('2024-02-11'),
      },
      {
        content:
          "Teaching a masterclass tomorrow on Beef Wellington. Here's a preview! 👨‍🍳",
        userId: userIds[4].toString(),
        userName: users[4].name,
        recipeId: recipeIds[4].toString(),
        recipeTitle: recipes[4].title,
        likes: [],
        likesCount: 45,
        commentsCount: 12,
        createdAt: new Date('2024-02-13'),
        updatedAt: new Date('2024-02-13'),
      },
      {
        content: 'Fresh sushi night! 🍣',
        userId: userIds[5].toString(),
        userName: users[5].name,
        recipeId: recipeIds[5].toString(),
        recipeTitle: recipes[5].title,
        likes: [],
        likesCount: 30,
        commentsCount: 8,
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15'),
      },
    ];

    await db.collection('posts').insertMany(posts);
    console.log(`✅ Created ${posts.length} posts`);

    // ============================================
    // SUMMARY
    // ============================================

    console.log('\n📊 Seed Summary:');
    console.log('================');
    console.log(`Users: ${users.length}`);
    console.log(
      `  - Premium: ${users.filter((u) => u.subscription.isPremium).length} ⭐`,
    );
    console.log(
      `  - Free: ${users.filter((u) => !u.subscription.isPremium).length} 🆓`,
    );
    console.log(`Recipes: ${recipes.length}`);
    console.log(`Posts: ${posts.length}`);
    console.log('================\n');

    console.log('✅ Database seeded successfully!');
    console.log('\n📝 Test Users:');
    console.log('==============');
    users.forEach((user) => {
      const icon = user.subscription.isPremium ? '⭐' : '🆓';
      const tier = user.subscription.tier;
      console.log(
        `${icon} ${user.email} (${tier}) - password: password123`,
      );
    });
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

seed()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
