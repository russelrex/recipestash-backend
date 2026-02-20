import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

async function migratePremiumField() {
  console.log('🔄 Starting migration: Add isPremium field to users');

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
    const usersCollection = db.collection('users');

    // Add isPremium field to all existing users (default: false)
    const result = await usersCollection.updateMany(
      { isPremium: { $exists: false } },
      {
        $set: {
          isPremium: false,
          subscriptionTier: 'free',
        },
      },
    );

    console.log(`✅ Updated ${result.modifiedCount} users with isPremium field`);

    // Count users
    const totalUsers = await usersCollection.countDocuments();
    const premiumUsers = await usersCollection.countDocuments({
      isPremium: true,
    });

    console.log(`📊 Total users: ${totalUsers}`);
    console.log(`📊 Premium users: ${premiumUsers}`);
    console.log(`📊 Free users: ${totalUsers - premiumUsers}`);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

migratePremiumField()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
