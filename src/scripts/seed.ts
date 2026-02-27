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
    console.log('🌱 Starting FRESH database seeding...');

    // Debug: Show what we're connecting to
    console.log('📍 MONGODB_URL:', process.env.MONGODB_URL);
    console.log('📍 MONGODB_NAME:', process.env.MONGODB_NAME);

    app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get(getConnectionToken()) as Connection;
    const db = connection.db;

    if (!db) {
      throw new Error('Database connection is not initialized');
    }

    // Debug: Show actual connection
    console.log('📍 Connected to host:', connection.host);
    console.log('📍 Connected to database:', connection.name);
    console.log('📍 Connection ready state:', connection.readyState); // 1 = connected

    const usersService = app.get(UsersService);
    const recipesService = app.get(RecipesService);
    const postsService = app.get(PostsService);

    // ============================================
    // FRESH START - Clear ALL existing data
    // ============================================
    console.log('\n⚠️  ============ CLEARING ALL DATA ============');

    try {
      // Clear collections directly using mongoose connection
      const collections = await db.collections();

      for (const collection of collections) {
        await collection.deleteMany({});
        console.log(`🗑️  Cleared ${collection.collectionName}`);
      }

      console.log('✅ All collections cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing collections:', error);
      throw error;
    }

    // ============================================
    // SEED 5 USERS with Profile Pictures
    // ============================================
    console.log('\n👤 ============ SEEDING USERS ============');

    const usersData = [
      {
        name: 'Sarah Mitchell',
        email: 'sarah@recipestash.com',
        password: 'password123',
        profilePicture:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop', // Woman with brown hair
        bio: 'Professional pastry chef and food blogger. Love creating sweet treats! 🍰',
        subscription: {
          isPremium: true,
          tier: 'premium',
          startDate: new Date('2024-01-15'),
          expiryDate: new Date('2025-01-15'),
          status: 'active' as const,
          paymentMethod: 'paymongo',
        },
      },
      {
        name: 'Marcus Rodriguez',
        email: 'marcus@recipestash.com',
        password: 'password123',
        profilePicture:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', // Man with beard
        bio: 'BBQ enthusiast and grill master. Smoked meats are my passion! 🔥',
        subscription: {
          isPremium: false,
          tier: 'free',
          status: 'active' as const,
        },
      },
      {
        name: 'Emily Chen',
        email: 'emily@recipestash.com',
        password: 'password123',
        profilePicture:
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop', // Asian woman
        bio: 'Vegan chef and nutrition consultant. Plant-based recipes for a better world! 🌱',
        subscription: {
          isPremium: true,
          tier: 'pro',
          startDate: new Date('2024-02-01'),
          expiryDate: new Date('2025-02-01'),
          status: 'active' as const,
          paymentMethod: 'gcash',
        },
      },
      {
        name: 'David Thompson',
        email: 'david@recipestash.com',
        password: 'password123',
        profilePicture:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop', // Man smiling
        bio: 'Home cook exploring international cuisines. Always trying new recipes! 🌍',
        subscription: {
          isPremium: false,
          tier: 'free',
          status: 'active' as const,
        },
      },
      {
        name: 'Isabella Martinez',
        email: 'isabella@recipestash.com',
        password: 'password123',
        profilePicture:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop', // Woman with glasses
        bio: 'Italian cuisine specialist. Pasta and wine are life! 🍝🍷',
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
    for (const userData of usersData) {
      const user = await usersService.create(
        userData.name,
        userData.email,
        userData.password,
        userData.subscription,
      );

      // Update profile picture and bio
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            profilePicture: userData.profilePicture,
            bio: userData.bio,
          },
        },
      );

      const plainUser =
        user.toObject && typeof user.toObject === 'function'
          ? user.toObject()
          : user;

      users.push({
        ...plainUser,
        profilePicture: userData.profilePicture,
        bio: userData.bio,
      });

      const icon = userData.subscription?.isPremium ? '⭐' : '🆓';
      const tier = userData.subscription?.tier ?? 'free';
      console.log(`✅ ${icon} ${userData.name} (${tier}) - ${userData.email}`);
    }

    const userId1 = users[0]._id?.toString();
    const userId2 = users[1]._id?.toString();
    const userId3 = users[2]._id?.toString();
    const userId4 = users[3]._id?.toString();
    const userId5 = users[4]._id?.toString();

    // ============================================
    // SEED 15 RECIPES (3 per user) with Images
    // ============================================
    console.log('\n🍳 ============ SEEDING RECIPES ============');

    const recipesData = [
      // Sarah's recipes
      {
        ownerId: userId1,
        ownerName: users[0].name,
        title: 'Classic Chocolate Chip Cookies',
        description:
          'The ultimate chocolate chip cookies with crispy edges and chewy centers. Perfect for any occasion!',
        category: 'Dessert',
        prepTime: 15,
        cookTime: 12,
        servings: 24,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '2 1/4 cups all-purpose flour',
          '1 tsp baking soda',
          '1 tsp salt',
          '1 cup butter, softened',
          '3/4 cup granulated sugar',
          '3/4 cup packed brown sugar',
          '2 large eggs',
          '2 tsp vanilla extract',
          '2 cups chocolate chips',
        ],
        instructions: [
          'Preheat oven to 375°F (190°C). Line baking sheets with parchment paper.',
          'In a medium bowl, whisk together flour, baking soda, and salt.',
          'In a large bowl, cream butter and both sugars until light and fluffy.',
          'Beat in eggs one at a time, then stir in vanilla.',
          'Gradually blend in the flour mixture.',
          'Stir in chocolate chips.',
          'Drop rounded tablespoons of dough onto prepared baking sheets.',
          'Bake for 9-11 minutes or until golden brown.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId1,
        ownerName: users[0].name,
        title: 'Lemon Berry Cupcakes',
        description:
          'Light and fluffy lemon cupcakes topped with a tangy cream cheese frosting and fresh berries.',
        category: 'Dessert',
        prepTime: 25,
        cookTime: 18,
        servings: 12,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop',
        isPublic: true,
        featured: false,
        ingredients: [
          '1 1/2 cups all-purpose flour',
          '1 1/2 tsp baking powder',
          '1/2 tsp salt',
          '1/2 cup butter, softened',
          '1 cup granulated sugar',
          '2 large eggs',
          '1/2 cup milk',
          'Zest and juice of 1 lemon',
          'Fresh mixed berries',
          '8 oz cream cheese',
          '1 1/2 cups powdered sugar',
        ],
        instructions: [
          'Preheat oven to 350°F (175°C) and line a muffin tin with cupcake liners.',
          'Whisk together flour, baking powder, and salt in a bowl.',
          'In another bowl, cream butter and sugar until light and fluffy.',
          'Beat in eggs one at a time, then mix in lemon zest and juice.',
          'Alternate adding dry ingredients and milk until just combined.',
          'Fill liners 2/3 full and bake 16–18 minutes until a toothpick comes out clean.',
          'Beat cream cheese and powdered sugar until smooth for frosting.',
          'Frost cooled cupcakes and top with fresh berries.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId1,
        ownerName: users[0].name,
        title: 'Salted Caramel Brownies',
        description:
          'Rich, fudgy brownies swirled with homemade salted caramel and topped with flaky sea salt.',
        category: 'Dessert',
        prepTime: 20,
        cookTime: 30,
        servings: 16,
        difficulty: 'medium' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1606313654477-075bbba2ecbb?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '1 cup unsalted butter',
          '8 oz dark chocolate, chopped',
          '1 1/2 cups granulated sugar',
          '1/2 cup brown sugar',
          '4 large eggs',
          '1 cup all-purpose flour',
          '1/4 cup cocoa powder',
          '1 tsp vanilla extract',
          '1/2 tsp salt',
          '1/2 cup salted caramel sauce',
          'Flaky sea salt for topping',
        ],
        instructions: [
          'Preheat oven to 350°F (175°C) and line a 9x13 pan with parchment.',
          'Melt butter and chocolate together until smooth; let cool slightly.',
          'Whisk in sugars, then beat in eggs one at a time and add vanilla.',
          'Fold in flour, cocoa powder, and salt until just combined.',
          'Pour batter into pan and dollop caramel on top, swirling gently.',
          'Bake 25–30 minutes until edges are set but center is fudgy.',
          'Cool completely, sprinkle with flaky sea salt, then slice.',
        ],
        isFavorite: false,
        rating: 5,
      },

      // Marcus's recipes
      {
        ownerId: userId2,
        ownerName: users[1].name,
        title: 'Perfect Grilled Ribeye Steak',
        description:
          'Restaurant-quality grilled ribeye with garlic herb butter. Simple yet incredibly delicious!',
        category: 'Main Course',
        prepTime: 10,
        cookTime: 15,
        servings: 2,
        difficulty: 'medium' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '2 ribeye steaks (1.5 inches thick)',
          '2 tbsp olive oil',
          'Sea salt and black pepper',
          '4 cloves garlic, minced',
          '3 tbsp butter',
          'Fresh rosemary and thyme',
        ],
        instructions: [
          'Remove steaks from fridge 30 minutes before cooking.',
          'Preheat grill to high heat.',
          'Rub steaks with olive oil, salt, and pepper.',
          'Grill steaks for 4-5 minutes per side for medium-rare.',
          'Make herb butter by mixing butter, garlic, and herbs.',
          'Let steaks rest for 5 minutes, then top with herb butter.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId2,
        ownerName: users[1].name,
        title: 'Low and Slow Smoked BBQ Ribs',
        description:
          'Fall-off-the-bone pork ribs smoked low and slow with a sweet and smoky barbecue glaze.',
        category: 'Main Course',
        prepTime: 30,
        cookTime: 240,
        servings: 4,
        difficulty: 'hard' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '2 racks pork ribs',
          '1/4 cup brown sugar',
          '2 tbsp paprika',
          '1 tbsp garlic powder',
          '1 tbsp onion powder',
          '1 tsp cayenne pepper',
          'Salt and black pepper',
          '1 cup barbecue sauce',
          'Apple juice for spritzing',
        ],
        instructions: [
          'Remove silver skin from ribs and pat dry.',
          'Mix dry rub ingredients and coat ribs generously on all sides.',
          'Preheat smoker to 225°F (107°C).',
          'Smoke ribs meat-side up for 3 hours, spritzing with apple juice every 45 minutes.',
          'Wrap ribs in foil with a splash of apple juice and cook 2 more hours.',
          'Unwrap, brush with barbecue sauce, and cook 30 minutes to set the glaze.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId2,
        ownerName: users[1].name,
        title: 'Garlic Herb Grilled Salmon',
        description:
          'Juicy grilled salmon fillets marinated in garlic, lemon, and fresh herbs for a quick and healthy dinner.',
        category: 'Main Course',
        prepTime: 15,
        cookTime: 12,
        servings: 4,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
        isPublic: true,
        featured: false,
        ingredients: [
          '4 salmon fillets',
          '3 tbsp olive oil',
          '3 cloves garlic, minced',
          'Juice of 1 lemon',
          '2 tbsp chopped fresh parsley',
          'Salt and black pepper',
        ],
        instructions: [
          'Whisk together olive oil, garlic, lemon juice, parsley, salt, and pepper.',
          'Marinate salmon fillets for 15–20 minutes.',
          'Preheat grill to medium-high heat and oil the grates.',
          'Grill salmon 4–5 minutes per side until just cooked through.',
          'Serve with extra lemon wedges.',
        ],
        isFavorite: false,
        rating: 4,
      },

      // Emily's recipes
      {
        ownerId: userId3,
        ownerName: users[2].name,
        title: 'Buddha Bowl with Tahini Dressing',
        description:
          'Colorful and nutritious vegan Buddha bowl packed with healthy ingredients and amazing flavors.',
        category: 'Lunch',
        prepTime: 20,
        cookTime: 25,
        servings: 2,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '1 cup quinoa',
          '1 can chickpeas, drained',
          '2 cups mixed greens',
          '1 sweet potato, cubed',
          '1 avocado, sliced',
          '1/4 cup tahini',
          '2 tbsp lemon juice',
          'Cherry tomatoes',
          'Cucumber',
        ],
        instructions: [
          'Cook quinoa according to package directions.',
          'Roast sweet potato cubes at 400°F for 25 minutes.',
          'Roast chickpeas with olive oil and spices.',
          'Make tahini dressing with tahini, lemon juice, and water.',
          'Arrange all ingredients in bowls.',
          'Drizzle with tahini dressing and serve.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId3,
        ownerName: users[2].name,
        title: 'Creamy Coconut Lentil Curry',
        description:
          'Comforting vegan red lentil curry simmered in coconut milk with warm spices and fresh cilantro.',
        category: 'Dinner',
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '1 cup red lentils, rinsed',
          '1 onion, diced',
          '3 cloves garlic, minced',
          '1 tbsp grated ginger',
          '2 tbsp curry powder',
          '1 tsp ground cumin',
          '1 can coconut milk',
          '2 cups vegetable broth',
          'Salt and pepper',
          'Fresh cilantro for garnish',
        ],
        instructions: [
          'Sauté onion in a pot until translucent, then add garlic and ginger.',
          'Stir in curry powder and cumin and cook 1 minute until fragrant.',
          'Add lentils, coconut milk, and vegetable broth.',
          'Simmer 20–25 minutes until lentils are tender and curry has thickened.',
          'Season with salt and pepper and garnish with cilantro.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId3,
        ownerName: users[2].name,
        title: 'Green Goddess Power Salad',
        description:
          'A bright, crunchy salad loaded with greens, seeds, and a creamy herb-packed green goddess dressing.',
        category: 'Lunch',
        prepTime: 20,
        cookTime: 0,
        servings: 2,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
        isPublic: true,
        featured: false,
        ingredients: [
          '4 cups mixed greens',
          '1 avocado, sliced',
          '1/2 cup cherry tomatoes, halved',
          '1/4 cup pumpkin seeds',
          '1/4 cup sunflower seeds',
          '1/4 cup cucumber, sliced',
          '1/2 cup cooked quinoa',
          '1/2 cup green goddess dressing',
        ],
        instructions: [
          'Arrange mixed greens in a large bowl.',
          'Top with avocado, tomatoes, cucumber, seeds, and quinoa.',
          'Drizzle with green goddess dressing and toss gently.',
        ],
        isFavorite: false,
        rating: 4,
      },

      // David's recipes
      {
        ownerId: userId4,
        ownerName: users[3].name,
        title: 'Spicy Thai Basil Chicken',
        description:
          'Authentic Thai basil chicken (Pad Krapow Gai) with bold flavors and aromatic basil. Quick and easy!',
        category: 'Main Course',
        prepTime: 10,
        cookTime: 10,
        servings: 4,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&h=600&fit=crop',
        isPublic: true,
        featured: false,
        ingredients: [
          '1 lb ground chicken',
          '3 cloves garlic, minced',
          '2 Thai chilies, chopped',
          '2 tbsp soy sauce',
          '1 tbsp fish sauce',
          '1 tbsp oyster sauce',
          '1 tsp sugar',
          '2 cups Thai basil leaves',
          'Jasmine rice for serving',
        ],
        instructions: [
          'Heat oil in a wok over high heat.',
          'Sauté garlic and chilies until fragrant.',
          'Add ground chicken and cook until browned.',
          'Add soy sauce, fish sauce, oyster sauce, and sugar.',
          'Stir in Thai basil leaves until wilted.',
          'Serve over jasmine rice with fried egg on top.',
        ],
        isFavorite: false,
        rating: 4,
      },
      {
        ownerId: userId4,
        ownerName: users[3].name,
        title: 'One-Pot Creamy Tuscan Chicken',
        description:
          'Pan-seared chicken in a creamy garlic sauce with sun-dried tomatoes and spinach, all made in one pan.',
        category: 'Main Course',
        prepTime: 15,
        cookTime: 25,
        servings: 4,
        difficulty: 'medium' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '4 chicken thighs, boneless and skinless',
          '2 tbsp olive oil',
          '3 cloves garlic, minced',
          '1/2 cup sun-dried tomatoes, chopped',
          '1 cup heavy cream',
          '1/2 cup chicken broth',
          '2 cups baby spinach',
          'Salt and pepper',
        ],
        instructions: [
          'Season chicken with salt and pepper and sear in olive oil until golden and cooked through; remove from pan.',
          'Sauté garlic and sun-dried tomatoes in the same pan.',
          'Pour in cream and chicken broth and simmer until slightly thickened.',
          'Stir in spinach until wilted, then return chicken to the pan.',
          'Simmer a few minutes more and serve over pasta or rice.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId4,
        ownerName: users[3].name,
        title: 'Weeknight Veggie Stir-Fry',
        description:
          'Quick and colorful vegetable stir-fry with a simple soy-ginger sauce, perfect for busy weeknights.',
        category: 'Dinner',
        prepTime: 15,
        cookTime: 10,
        servings: 3,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
        isPublic: true,
        featured: false,
        ingredients: [
          '2 cups broccoli florets',
          '1 red bell pepper, sliced',
          '1 carrot, julienned',
          '1 cup snap peas',
          '2 tbsp soy sauce',
          '1 tbsp sesame oil',
          '1 tbsp grated ginger',
          '2 cloves garlic, minced',
        ],
        instructions: [
          'Heat sesame oil in a wok over high heat.',
          'Add garlic and ginger and cook until fragrant.',
          'Add vegetables and stir-fry 4–5 minutes until crisp-tender.',
          'Add soy sauce and toss to coat; serve immediately.',
        ],
        isFavorite: false,
        rating: 4,
      },

      // Isabella's recipes
      {
        ownerId: userId5,
        ownerName: users[4].name,
        title: 'Homemade Fettuccine Alfredo',
        description:
          'Creamy, authentic Fettuccine Alfredo made with just butter, parmesan, and pasta water. Italian comfort food at its finest!',
        category: 'Main Course',
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        difficulty: 'easy' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          '1 lb fresh fettuccine pasta',
          '1 cup (2 sticks) unsalted butter',
          '2 cups freshly grated Parmesan cheese',
          'Salt and black pepper to taste',
          'Fresh parsley for garnish',
          'Pasta water (reserved)',
        ],
        instructions: [
          'Cook fettuccine in salted boiling water until al dente. Reserve 1 cup pasta water.',
          'In a large pan, melt butter over medium heat.',
          'Add hot, drained pasta to the butter.',
          'Add Parmesan cheese gradually, tossing constantly.',
          'Add pasta water little by little until creamy.',
          'Season with salt and pepper, garnish with parsley.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId5,
        ownerName: users[4].name,
        title: 'Margherita Pizza with Fresh Basil',
        description:
          'Classic Italian-style Margherita pizza with a crisp crust, fresh mozzarella, tomatoes, and basil.',
        category: 'Main Course',
        prepTime: 30,
        cookTime: 12,
        servings: 2,
        difficulty: 'medium' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1548366086-7a1c9c44a9a5?w=800&h=600&fit=crop',
        isPublic: true,
        featured: true,
        ingredients: [
          'Pizza dough for 2 small pizzas',
          '1 cup crushed tomatoes',
          '2 cups fresh mozzarella, sliced',
          'Fresh basil leaves',
          '2 tbsp olive oil',
          'Salt and pepper',
        ],
        instructions: [
          'Preheat oven and pizza stone to 500°F (260°C).',
          'Stretch dough into rounds and place on a floured peel.',
          'Spread a thin layer of crushed tomatoes over each crust.',
          'Top with slices of fresh mozzarella and a drizzle of olive oil.',
          'Bake 8–12 minutes until crust is crisp and cheese is bubbly.',
          'Top with fresh basil leaves and serve immediately.',
        ],
        isFavorite: false,
        rating: 5,
      },
      {
        ownerId: userId5,
        ownerName: users[4].name,
        title: 'Tiramisu in a Glass',
        description:
          'Elegant single-serve tiramisu cups with layers of espresso-soaked ladyfingers and mascarpone cream.',
        category: 'Dessert',
        prepTime: 25,
        cookTime: 0,
        servings: 6,
        difficulty: 'medium' as const,
        featuredImage:
          'https://images.unsplash.com/photo-1518131678677-bc1a4dca4ccb?w=800&h=600&fit=crop',
        isPublic: true,
        featured: false,
        ingredients: [
          '24 ladyfinger cookies',
          '1 1/2 cups strong espresso, cooled',
          '3 tbsp coffee liqueur (optional)',
          '3 large egg yolks',
          '1/2 cup granulated sugar',
          '8 oz mascarpone cheese',
          '1 cup heavy cream, whipped',
          'Cocoa powder for dusting',
        ],
        instructions: [
          'Whisk egg yolks and sugar over a double boiler until thick and pale; cool slightly.',
          'Beat in mascarpone until smooth, then fold in whipped cream.',
          'Combine espresso and coffee liqueur in a shallow dish.',
          'Dip ladyfingers quickly into espresso mixture and layer in glasses.',
          'Alternate layers of mascarpone cream and soaked ladyfingers.',
          'Chill at least 4 hours and dust with cocoa powder before serving.',
        ],
        isFavorite: false,
        rating: 5,
      },
    ];

    const createdRecipes: any[] = [];
    for (const recipeData of recipesData) {
      const recipe = await recipesService.create(recipeData);
      createdRecipes.push(recipe);
      console.log(`✅ Created: ${recipe.title} by ${recipeData.ownerName}`);
    }

    // ============================================
    // SEED 10 POSTS (2 per user) with Recipe Links
    // ============================================
    console.log('\n📰 ============ SEEDING POSTS ============');

    const postsData = [
      // Sarah's posts
      {
        userId: userId1,
        userName: users[0].name,
        content:
          'Just baked a fresh batch of these chocolate chip cookies! The secret is using both white and brown sugar. Crispy edges, chewy centers - perfection! 🍪✨',
        recipeId: createdRecipes[0]._id.toString(),
      },
      {
        userId: userId1,
        userName: users[0].name,
        content:
          "Sunday baking vibes! There's nothing like the smell of fresh cookies in the oven. Who else loves baking on weekends? 😊",
        recipeId: createdRecipes[0]._id.toString(),
      },

      // Marcus's posts
      {
        userId: userId2,
        userName: users[1].name,
        content:
          'Fired up the grill tonight for some ribeye perfection! The garlic herb butter takes this to the next level. Medium-rare is the only way! 🥩🔥',
        recipeId: createdRecipes[1]._id.toString(),
      },
      {
        userId: userId2,
        userName: users[1].name,
        content:
          "Pro tip: Let your steaks come to room temperature before grilling. Makes ALL the difference! Who's grilling this weekend?",
        recipeId: createdRecipes[1]._id.toString(),
      },

      // Emily's posts
      {
        userId: userId3,
        userName: users[2].name,
        content:
          'Meal prep Sunday! Made these Buddha bowls for the week ahead. So colorful, so healthy, so delicious! 🌱🥗 Plant-based eating never looked so good!',
        recipeId: createdRecipes[2]._id.toString(),
      },
      {
        userId: userId3,
        userName: users[2].name,
        content:
          'This tahini dressing is EVERYTHING! Creamy, tangy, and perfect for any salad or bowl. Going to make a big batch to use all week! 😍',
        recipeId: createdRecipes[2]._id.toString(),
      },

      // David's posts
      {
        userId: userId4,
        userName: users[3].name,
        content:
          'Thai night at home! This basil chicken is ridiculously good and ready in 20 minutes. The key is HIGH heat and lots of basil! 🌶️🔥',
        recipeId: createdRecipes[3]._id.toString(),
      },
      {
        userId: userId4,
        userName: users[3].name,
        content:
          "Can't get enough of this Pad Krapow Gai! Pro tip: serve it with a fried egg on top. Thai street food at its finest! 🇹🇭",
        recipeId: createdRecipes[3]._id.toString(),
      },

      // Isabella's posts
      {
        userId: userId5,
        userName: users[4].name,
        content:
          'Made this authentic Fettuccine Alfredo tonight! No cream, just butter, parmesan, and pasta water magic. This is how Italians do it! 🇮🇹✨',
        recipeId: createdRecipes[4]._id.toString(),
      },
      {
        userId: userId5,
        userName: users[4].name,
        content:
          'The secret to perfect Alfredo? Save that pasta water! It creates the silkiest sauce. Nonna would be proud! 👵🏻❤️',
        recipeId: createdRecipes[4]._id.toString(),
      },
    ];

    const createdPosts: any[] = [];
    for (const postData of postsData) {
      const post = await postsService.create(postData.userId, {
        content: postData.content,
        recipeId: postData.recipeId,
      });
      createdPosts.push(post);
      console.log(
        `✅ Post by ${postData.userName}: "${postData.content.substring(0, 50)}..."`,
      );
    }

    // ============================================
    // SEED COMMENTS (Add interactions)
    // ============================================
    console.log('\n💬 ============ SEEDING COMMENTS ============');

    // Comments on Sarah's cookie post
    await postsService.createComment(createdPosts[0]._id.toString(), userId2, {
      content:
        'Those cookies look absolutely amazing! Saving this recipe for sure! 😍',
    });
    await postsService.createComment(createdPosts[0]._id.toString(), userId3, {
      content:
        'Can I make these with coconut sugar? Trying to keep it vegan-friendly! 🌱',
    });
    await postsService.createComment(createdPosts[0]._id.toString(), userId4, {
      content: 'Making these tonight! My kids are going to love them! 🍪',
    });

    // Comments on Marcus's steak post
    await postsService.createComment(createdPosts[2]._id.toString(), userId1, {
      content: 'That char looks perfect! What temperature do you grill at?',
    });
    await postsService.createComment(createdPosts[2]._id.toString(), userId5, {
      content: 'Beautiful! The herb butter is such a nice touch 👨‍🍳',
    });

    // Comments on Emily's Buddha bowl post
    await postsService.createComment(createdPosts[4]._id.toString(), userId1, {
      content: 'So vibrant and healthy! Love all the colors! 🌈',
    });
    await postsService.createComment(createdPosts[4]._id.toString(), userId4, {
      content: 'This is exactly what I need for my lunch meal prep! Thanks! 🙏',
    });

    console.log('✅ Added comments to posts');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n📊 ============ SEED SUMMARY ============');
    console.log('=====================================');
    console.log(`✅ Users created: ${users.length}`);
    console.log(
      `   - Premium users: ${usersData.filter((u) => u.subscription?.isPremium).length} ⭐`,
    );
    console.log(
      `   - Free users: ${usersData.filter((u) => !u.subscription?.isPremium).length} 🆓`,
    );
    console.log(`✅ Recipes created: ${createdRecipes.length}`);
    console.log(
      `   - Featured recipes: ${createdRecipes.filter((r: any) => r.featured).length}`,
    );
    console.log(`✅ Posts created: ${createdPosts.length}`);
    console.log(
      `   - Posts with recipe links: ${postsData.filter((p) => p.recipeId).length}`,
    );
    console.log(`✅ Comments added: ${7}`);
    console.log('=====================================');

    console.log('\n📝 ============ TEST CREDENTIALS ============');
    console.log('Password for ALL users: password123');
    console.log('===========================================');
    usersData.forEach((u, index) => {
      const icon = u.subscription?.isPremium ? '⭐' : '🆓';
      const tier = u.subscription?.tier ?? 'free';
      console.log(`${icon} ${u.email} (${tier}) - ${u.name}`);
    });
    console.log('===========================================');

    console.log('\n✅ ============ DATABASE SEEDING COMPLETED ============');
    console.log('All data has been successfully seeded!');
    console.log('You can now login with any of the accounts above.');
    console.log('====================================================\n');

    await app.close();
  } catch (error) {
    console.error('\n❌ ============ ERROR SEEDING DATABASE ============');
    console.error(error);
    console.error('===================================================\n');
    if (app) {
      await app.close();
    }
    process.exit(1);
  }
}

bootstrap();
