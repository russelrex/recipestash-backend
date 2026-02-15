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

async function checkUser() {
  const env = loadEnv();
  const url = env.MONGODB_URL;
  const dbName = env.MONGODB_NAME || 'recipestash';

  console.log('🔍 Checking user...');
  console.log('📍 Database:', dbName);

  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find the specific user
    const user = await usersCollection.findOne({ email: 'russel@email.com' });

    if (user) {
      console.log('✅ User found!');
      console.log('\n📧 Email:', user.email);
      console.log('👤 Name:', user.name);
      console.log('🔑 Password field exists:', !!user.password);
      console.log('🔑 Password field type:', typeof user.password);
      console.log('🔑 Password field value:', user.password ? `${user.password.substring(0, 20)}...` : 'NULL/UNDEFINED');
      console.log('🔑 Password length:', user.password ? user.password.length : 0);
      console.log('📅 Created:', user.createdAt);
      console.log('📅 Last login:', user.lastLoginAt || 'Never');
      console.log('\n📝 Full user object (excluding password):');
      const { password, ...userWithoutPassword } = user;
      console.log(JSON.stringify(userWithoutPassword, null, 2));
    } else {
      console.log('❌ User not found with email: russel@email.com');
      console.log('\n📋 All users in database:');
      const allUsers = await usersCollection.find({}).toArray();
      allUsers.forEach((u) => {
        console.log(`   - ${u.email} (${u.name}) - Password: ${u.password ? 'EXISTS' : 'MISSING'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkUser();
