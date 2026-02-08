# Railway Deployment Guide - RecipeStash Backend

## ✅ Implementation Complete

All Railway environment variable fixes have been applied to the codebase.

## Changes Made

### 1. ConfigModule Configuration (`src/app.module.ts`)
- ✅ `ignoreEnvFile: true` in production (reads from Railway env vars)
- ✅ `cache: false` to ensure fresh variable loading
- ✅ `expandVariables: true` for variable expansion
- ✅ Comprehensive logging for debugging
- ✅ Checks multiple variable names: `MONGODB_URL`, `MONGODB_URI`, `MONGO_URL`

### 2. Main.ts Updates (`src/main.ts`)
- ✅ Binds to `0.0.0.0` (required for Railway)
- ✅ Uses `process.env.PORT` (Railway provides this)
- ✅ Enhanced startup logging
- ✅ Error handling with process.exit(1)

### 3. Package.json Scripts
- ✅ `start` script uses `node dist/main` (production-ready)
- ✅ `prebuild` script cleans dist folder
- ✅ `start:prod` available as alias

### 4. Debug Endpoints (`src/app.controller.ts`)
- ✅ `/api/health` - Health check endpoint
- ✅ `/api/debug-env` - Environment variable debug (REMOVE IN PRODUCTION)

## Railway Configuration

### Step 1: Set Environment Variables

Go to: **Railway Dashboard → Your Project → Your Service → Variables**

Add these variables (click "Add Variable" for each):

```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/recipestash?retryWrites=true&w=majority
MONGODB_NAME=recipestash
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
NODE_ENV=production
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=recipestash-images
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**Important Notes:**
- Variable name: `MONGODB_URL` (no quotes, no `=`)
- Variable value: `mongodb+srv://...` (just the connection string)
- Do NOT include quotes around values
- Do NOT include `=` in variable names

### Step 2: Verify Railway Settings

**Build Settings:**
- Build Command: `npm run build` (or leave default)
- Start Command: `npm start` (or `node dist/main`)
- Root Directory: `/` (unless backend is in subdirectory)

**Port:**
- Railway automatically sets `PORT` environment variable
- App binds to `0.0.0.0:PORT` automatically

### Step 3: Deploy

1. Push code to GitHub (if connected)
2. Railway will auto-deploy
3. Check logs for:
   ```
   🔍 Environment Check:
   NODE_ENV: production
   Available MongoDB variables:
   - MONGODB_URL: ✓ SET
   - MONGODB_NAME: ✓ SET
   ✓ MongoDB URL found
   ✓ Database name: recipestash
   ✅ Application is running on http://0.0.0.0:8080/api
   ```

## Testing Deployment

### 1. Check Health Endpoint
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T...",
  "uptime": 123.45
}
```

### 2. Check Root Endpoint
```bash
curl https://your-app.railway.app/api
```

Expected response:
```json
{
  "success": true,
  "message": "RecipeStash Backend is working!",
  "version": "1.0.0",
  "timestamp": "2026-02-08T..."
}
```

### 3. Debug Environment (Development Only)
```bash
curl https://your-app.railway.app/api/debug-env
```

**⚠️ REMOVE THIS ENDPOINT IN PRODUCTION** - It exposes environment variable names.

## Troubleshooting

### Issue: Variables Still Not Loading

**Solution:**
1. Railway dashboard → Settings → Restart
2. Or redeploy: Make a dummy commit and push
3. Check Railway logs for the "🔍 Environment Check" output

### Issue: MongoDB Connection Timeout

**Solution:**
1. Check MongoDB Atlas Network Access:
   - MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (allow all) or Railway's IP range
2. Verify connection string format:
   - Should start with `mongodb+srv://` or `mongodb://`
   - Check username/password are correct
   - Verify database name in connection string

### Issue: Port Already in Use

**Solution:**
- Railway automatically sets `PORT` - don't override it
- App binds to `0.0.0.0:PORT` automatically
- No manual port configuration needed

### Issue: Build Fails

**Solution:**
1. Check Railway logs for TypeScript errors
2. Ensure `package.json` has correct scripts
3. Verify Node.js version in Railway (should be 18+)

## Expected Logs on Startup

```
🚀 Starting RecipeStash Backend...
📍 NODE_ENV: production
📍 PORT: 8080
🔍 Environment Check:
NODE_ENV: production
Available MongoDB variables:
- MONGODB_URL: ✓ SET
- MONGODB_URI: ✗ NOT SET
- MONGO_URL: ✗ NOT SET
- MONGODB_NAME: ✓ SET
✓ MongoDB URL found
✓ Database name: recipestash
✅ Application is running on http://0.0.0.0:8080/api
```

## Security Checklist

- [ ] Remove `/api/debug-env` endpoint before production
- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Use MongoDB Atlas with strong password
- [ ] Configure CORS properly (not `*` in production)
- [ ] Set Redis password if using Redis
- [ ] Review all environment variables for sensitive data

## Success Indicators

✅ Logs show: `✓ MongoDB URL found`
✅ Logs show: `✅ Application is running`
✅ No error: `MONGODB_URL environment variable is required`
✅ Railway shows service as "Active"
✅ Can access `/api/health` endpoint
✅ Can access `/api` endpoint

## Next Steps

1. **Remove Debug Endpoint:**
   - Delete `getEnvDebug()` method from `app.controller.ts` before production

2. **Configure CORS:**
   - Update `main.ts` to use specific origins instead of `*`

3. **Set Up Monitoring:**
   - Add health check monitoring
   - Set up error tracking (Sentry, etc.)

4. **Database Setup:**
   - Run seed script if needed: `npm run seed:prod`
   - Verify collections exist

## Support

If issues persist:
1. Check Railway logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test MongoDB connection string locally
4. Check Railway service status
