const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');

  let env = {};

  // Load .env first
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }

  // Override with .env.local
  if (fs.existsSync(envLocalPath)) {
    const envLocalFile = fs.readFileSync(envLocalPath, 'utf8');
    envLocalFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }

  return env;
}

async function migratePasswordFields() {
  const env = loadEnv();
  const url = env.MONGODB_URL;
  const dbName = env.MONGODB_NAME || 'recipestash';

  console.log('🔄 Migrating password fields...');
  console.log('📍 Database:', dbName);

  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find all users with passwordHash but no password
    const usersWithPasswordHash = await usersCollection
      .find({ passwordHash: { $exists: true }, password: { $exists: false } })
      .toArray();

    console.log(`📊 Found ${usersWithPasswordHash.length} users with 'passwordHash' field\n`);

    if (usersWithPasswordHash.length === 0) {
      console.log('✅ No migration needed!');
      return;
    }

    let migratedCount = 0;

    for (const user of usersWithPasswordHash) {
      console.log(`🔄 Migrating user: ${user.email}`);
      
      // Rename passwordHash to password
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { password: user.passwordHash },
          $unset: { passwordHash: '' }
        }
      );

      migratedCount++;
      console.log(`   ✅ Migrated: ${user.email}`);
    }

    console.log(`\n✅ Migration complete! Migrated ${migratedCount} users.`);

    // Verify migration
    const remainingPasswordHash = await usersCollection.countDocuments({ passwordHash: { $exists: true } });
    const usersWithPassword = await usersCollection.countDocuments({ password: { $exists: true } });

    console.log('\n📊 Verification:');
    console.log(`   - Users with 'passwordHash': ${remainingPasswordHash}`);
    console.log(`   - Users with 'password': ${usersWithPassword}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

migratePasswordFields();
