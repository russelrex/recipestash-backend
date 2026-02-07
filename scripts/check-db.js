const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

async function checkDatabase() {
  const env = loadEnv();
  const url = env.MONGODB_URL;
  const dbName = env.MONGODB_NAME || 'test';
  
  console.log('🔍 Checking MongoDB connection...');
  console.log('📍 MONGODB_URL:', url);
  console.log('📍 MONGODB_NAME:', dbName);
  console.log('');
  
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    console.log('');
    
    // List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('📁 Available databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log('');
    
    // Check the target database
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Database "${dbName}" collections:`);
    if (collections.length === 0) {
      console.log('   ⚠️  No collections found!');
    } else {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}: ${count} documents`);
      }
    }
    console.log('');
    
    // Check if data exists in other databases
    console.log('🔍 Checking other databases for collections...');
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name !== 'admin' && dbInfo.name !== 'config' && dbInfo.name !== 'local') {
        const checkDb = client.db(dbInfo.name);
        const checkCollections = await checkDb.listCollections().toArray();
        if (checkCollections.length > 0) {
          console.log(`\n📁 Database "${dbInfo.name}":`);
          for (const col of checkCollections) {
            const count = await checkDb.collection(col.name).countDocuments();
            console.log(`   - ${col.name}: ${count} documents`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabase();
