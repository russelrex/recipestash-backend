const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');

  let env = {};

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

async function listAllUsers() {
  const env = loadEnv();
  const url = env.MONGODB_URL;
  const dbName = env.MONGODB_NAME || 'recipestash';

  console.log('👥 Listing all users...');
  console.log('📍 Database:', dbName);

  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    const users = await usersCollection.find({}).toArray();

    console.log(`📊 Total users: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'NO EMAIL'}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Password: ${user.password ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

listAllUsers();
