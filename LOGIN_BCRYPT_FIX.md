# Login Bcrypt Error Fix - Documentation

## Problem

**Error Message:**
```
{"success":false,"message":"data and hash arguments required"}
```

**Root Cause:**
The user documents in the MongoDB database had a field named `passwordHash` instead of `password`. The User schema expected the field to be named `password`, causing bcrypt to fail when trying to compare passwords during login.

```javascript
// What was in the database:
{
  email: "russel@email.com",
  passwordHash: "$2b$10$eXgvaAAqTsBaZNRuZwl9mOm5OwwMQNfflP/TX6MHluMKO1f9gaa/q"
}

// What the schema expected:
{
  email: "russel@email.com",
  password: "$2b$10$eXgvaAAqTsBaZNRuZwl9mOm5OwwMQNfflP/TX6MHluMKO1f9gaa/q"
}
```

---

## Solution

### Step 1: Created Migration Script

**File:** `/home/russel/recipestash-backend/scripts/migrate-password-field.js`

This script:
1. Finds all users with `passwordHash` field but no `password` field
2. Renames `passwordHash` to `password` for each user
3. Removes the old `passwordHash` field
4. Verifies the migration was successful

### Step 2: Ran Migration

```bash
node ./scripts/migrate-password-field.js
```

**Result:**
```
✅ Migration complete! Migrated 6 users.

📊 Verification:
   - Users with 'passwordHash': 0
   - Users with 'password': 9
```

### Step 3: Verified Fix

**Test Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"russel@email.com","password":"password123"}'
```

**Result:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "notificationsEnabled": true,
      "dietaryRestrictions": [],
      "measurementUnit": "metric",
      "privacyProfilePublic": true,
      "_id": "697e1b5d7e4186448f651f8f",
      "name": "russel",
      "email": "russel@email.com",
      "createdAt": "2026-01-31T15:10:21.510Z",
      "updatedAt": "2026-01-31T15:10:21.510Z",
      "__v": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

✅ **Login now works perfectly!**

---

## Why This Happened

This issue occurred because:

1. **Old User Creation Method:** Users were created with `passwordHash` field (possibly from an older version of the code or a different registration method)
2. **Schema Mismatch:** The current User entity schema (`src/modules/users/entities/user.entity.ts`) defines the password field as `password`
3. **Bcrypt Validation:** When `UsersService.validatePassword()` was called, it tried to access `user.password`, which was `undefined`, causing bcrypt to fail

---

## How to Prevent This

### 1. Keep Schema Consistent

**Current Schema (Correct):**
```typescript
// src/modules/users/entities/user.entity.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string; // ✅ Correct: Named "password"
  
  // ... other fields
}
```

### 2. User Creation Service

**Current Implementation (Correct):**
```typescript
// src/modules/users/users.service.ts
async create(name: string, email: string, password: string): Promise<User> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const createdUser = new this.userModel({
    name,
    email: email.toLowerCase(),
    password: hashedPassword, // ✅ Stores as "password"
  });

  return createdUser.save();
}
```

### 3. Password Validation

**Current Implementation (Correct):**
```typescript
// src/modules/users/users.service.ts
async validatePassword(user: User, password: string): Promise<boolean> {
  return await bcrypt.compare(password, user.password); // ✅ Uses "password"
}
```

---

## Available Users (After Migration)

After the migration, all 9 users in the database now have the correct `password` field:

1. `russel@email.com` - Password: `password123` ✅
2. `johndoe@email.com` - Has password
3. `john02@email.com` - Has password
4. `asdfasdf@test.com` - Has password
5. 5 users without email addresses (need to be fixed separately)

---

## Testing the Fix

### Test Login Endpoint

```bash
# Test with your account
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "russel@email.com",
    "password": "password123"
  }'

# Expected response: {"success":true,"message":"Login successful",...}
```

### Test Registration (Creates new user with correct field)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected response: {"success":true,"message":"Registration successful",...}
```

---

## Migration Script Reference

**Location:** `/home/russel/recipestash-backend/scripts/migrate-password-field.js`

**What it does:**
- Connects to MongoDB using environment variables
- Finds users with `passwordHash` but no `password`
- Renames `passwordHash` → `password`
- Removes old `passwordHash` field
- Verifies migration success

**Safe to run multiple times:** The script only migrates users that need migration (won't affect users that already have the correct field name).

---

## Additional Helper Scripts

### 1. Check Specific User

**File:** `scripts/check-user.js`

```bash
node ./scripts/check-user.js
```

Shows detailed info about `russel@email.com` including password field status.

### 2. List All Users

**File:** `scripts/list-users.js`

```bash
node ./scripts/list-users.js
```

Lists all users with their email, name, and password field status.

---

## Summary

✅ **Problem:** Users had `passwordHash` instead of `password` field  
✅ **Solution:** Migrated all users to use `password` field  
✅ **Result:** Login endpoint now works correctly  
✅ **Prevention:** Schema and service code are consistent  

**Login is now fully functional!** 🎉

---

## Notes for Production

If you deploy to production and encounter the same issue:

1. **Run the migration script on production database:**
   ```bash
   # SSH to production or run locally with production MongoDB URL
   MONGODB_URL=<production-url> node ./scripts/migrate-password-field.js
   ```

2. **Or update Railway environment:**
   - The migration script reads from `.env` and `.env.local`
   - Make sure `MONGODB_URL` points to the correct database

3. **Verify migration:**
   ```bash
   MONGODB_URL=<production-url> node ./scripts/list-users.js
   ```

---

**Fixed by:** Migration script created on 2026-02-15  
**Tested with:** `russel@email.com` account  
**Status:** ✅ Working
