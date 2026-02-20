import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateSubscription() {
  console.log('🔄 Starting migration: Add subscription object to users');

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

    // Update all users to have subscription object
    const result = await usersCollection.updateMany(
      { subscription: { $exists: false } },
      {
        $set: {
          subscription: {
            isPremium: false,
            tier: 'free',
            status: 'active',
          },
        },
      },
    );

    console.log(
      `✅ Updated ${result.modifiedCount} users with subscription object`,
    );

    // Migrate old isPremium field if exists
    const migrateOldField = await usersCollection.updateMany(
      { isPremium: { $exists: true } },
      [
        {
          $set: {
            'subscription.isPremium': '$isPremium',
            'subscription.tier': {
              $cond: {
                if: '$isPremium',
                then: {
                  $ifNull: ['$subscriptionTier', 'premium'],
                },
                else: 'free',
              },
            },
            'subscription.startDate': '$subscriptionStartDate',
            'subscription.expiryDate': '$subscriptionExpiry',
            'subscription.status': 'active',
          },
        },
        {
          $unset: [
            'isPremium',
            'subscriptionTier',
            'subscriptionExpiry',
            'subscriptionStartDate',
          ],
        },
      ],
    );

    console.log(
      `✅ Migrated ${migrateOldField.modifiedCount} users from old schema`,
    );

    // Count users by subscription
    const totalUsers = await usersCollection.countDocuments();
    const premiumUsers = await usersCollection.countDocuments({
      'subscription.isPremium': true,
    });
    const freeUsers = totalUsers - premiumUsers;

    console.log('\n📊 Migration Summary:');
    console.log('==================');
    console.log(`Total users: ${totalUsers}`);
    console.log(`Premium users: ${premiumUsers} ⭐`);
    console.log(`Free users: ${freeUsers} 🆓`);
    console.log('==================\n');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

migrateSubscription()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
