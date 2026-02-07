# RecipeStash Backend - Setup Guide

## MongoDB Setup

### Fix Docker Permissions (Required First Step)

If you get a "permission denied" error when running Docker commands, you need to add your user to the `docker` group:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker

# Verify it works
docker ps
```

**Note:** After running `usermod`, you need to log out and log back in (or restart your terminal session) for the changes to take effect. Alternatively, you can use `newgrp docker` in your current session.

### Option 1: Install Docker Compose Plugin (Recommended)

The scripts use Docker Compose V2 (`docker compose`). To install it:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify installation
docker compose version
```

### Option 2: Fix Old docker-compose (Alternative)

If you prefer to use the old `docker-compose` command, install the missing Python module:

```bash
sudo apt-get install -y python3-distutils
```

Then update `package.json` scripts to use `docker-compose` instead of `docker compose`.

### Option 3: Use Docker Compose Standalone

Download and install the standalone version:

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Quick Start

1. **Fix Docker Permissions** (see above) - Required if you get permission errors

2. **Install Docker Compose Plugin** (see above)

3. **Set up environment variables** - Create `.env.local`:
   ```env
   MONGODB_URL=mongodb://admin:password123@localhost:27017/recipestash?authSource=admin
   MONGODB_NAME=recipestash
   JWT_SECRET=your_jwt_secret_key
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=recipestash-images
   NODE_ENV=development
   PORT=3000
   ```

4. **Start MongoDB**:
   ```bash
   npm run db:start
   # or
   pnpm run db:start
   ```

5. **Seed the database**:
   ```bash
   npm run seed
   # or
   pnpm run seed
   ```

6. **Start the backend**:
   ```bash
   npm run start:dev
   # or
   pnpm run start:dev
   ```

## Database Management Commands

- `npm run db:start` - Start MongoDB
- `npm run db:stop` - Stop MongoDB
- `npm run db:restart` - Restart MongoDB
- `npm run db:logs` - View MongoDB logs
- `npm run db:reset` - Reset database (removes all data)
- `npm run db:seed` - Start DB + seed data
- `npm run db:fresh` - Reset DB + seed data

## Access Points

- **MongoDB**: `mongodb://admin:password123@localhost:27017/recipestash?authSource=admin`
- **Mongo Express UI**: http://localhost:8081
- **Backend API**: http://localhost:3000
