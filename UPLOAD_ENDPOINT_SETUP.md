# Upload Endpoint Setup - RecipeStash Backend

## ✅ Implementation Complete

The missing `/api/recipes/upload-image` endpoint has been added!

## What Changed

### 1. RecipesController (`src/modules/recipes/recipes.controller.ts`)
- ✅ Added `POST /api/recipes/upload-image` endpoint
- ✅ Uses `FileInterceptor` for multipart/form-data handling
- ✅ Validates file type (JPEG, PNG, WebP only)
- ✅ Validates file size (5MB max per image-upload.config)
- ✅ Uploads to S3 using existing S3Service
- ✅ Returns `{ url, filename, size }` on success

### 2. Main.ts (`src/main.ts`)
- ✅ Increased body size limit to 10MB
- ✅ Updated CORS to include OPTIONS method
- ✅ Added logging for upload endpoint URL

### 3. Dependencies
- ✅ Installed `@types/multer` for TypeScript support

### 4. .gitignore
- ✅ Added `uploads/` to ignore local uploads

## Endpoint Details

**URL:** `POST /api/recipes/upload-image`

**Headers:**
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <token>` (optional - endpoint is public)

**Body:**
- Field name: `file`
- Type: Image file (JPEG, PNG, WebP)
- Max size: 5MB

**Response (Success):**
```json
{
  "url": "https://bucket.s3.region.amazonaws.com/recipes/featured/uuid.jpg",
  "filename": "original-name.jpg",
  "size": 123456
}
```

**Response (Error - No File):**
```json
{
  "statusCode": 400,
  "message": "No file provided",
  "error": "Bad Request"
}
```

**Response (Error - Invalid Type):**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
  "error": "Bad Request"
}
```

## How It Works

1. **Client sends multipart/form-data** with field name `file`
2. **NestJS FileInterceptor** extracts the file
3. **Validation** checks file type and size
4. **Convert to base64** for S3Service compatibility
5. **Upload to S3** using existing S3Service
6. **Return URL** for client to use

## Integration with S3

The endpoint uses your existing S3Service:
- Uploads to: `recipes/featured/` folder
- Uses S3 bucket configured in environment variables
- Returns public S3 URL
- Handles errors gracefully

## Testing Locally

### Test 1: Check Endpoint Exists
```bash
curl -X POST http://localhost:3000/api/recipes/upload-image
```

**Expected:** `400 Bad Request` (no file provided) ✅
**NOT:** `404 Not Found` ❌

### Test 2: Upload an Image
```bash
curl -X POST http://localhost:3000/api/recipes/upload-image \
  -F "file=@/path/to/image.jpg"
```

**Expected:**
```json
{
  "url": "https://bucket.s3.region.amazonaws.com/recipes/featured/uuid.jpg",
  "filename": "image.jpg",
  "size": 123456
}
```

### Test 3: Invalid File Type
```bash
curl -X POST http://localhost:3000/api/recipes/upload-image \
  -F "file=@/path/to/document.pdf"
```

**Expected:**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
}
```

## Testing on Railway

After deployment:

```bash
# Should return 400 (not 404)
curl -X POST https://recipestash-backend-production.up.railway.app/api/recipes/upload-image

# Upload test
curl -X POST https://recipestash-backend-production.up.railway.app/api/recipes/upload-image \
  -F "file=@./test-image.jpg"
```

## Environment Variables

Make sure these are set in Railway:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

If S3 is not configured, you'll get:
```json
{
  "statusCode": 400,
  "message": "S3 bucket is not configured. Please set AWS_S3_BUCKET_NAME in environment variables."
}
```

## Logs to Expect

When a file is uploaded, you'll see:

```
📸 [RecipesController] ============ IMAGE UPLOAD REQUEST ============
📸 [RecipesController] Received file upload request
📸 [RecipesController] File details: {
  fieldname: 'file',
  originalname: 'photo.jpg',
  mimetype: 'image/jpeg',
  size: 123456
}
📤 [RecipesController] Uploading to S3...
[S3Service] Validating image...
[S3Service] Uploading to S3: bucket/recipes/featured/uuid.jpg (123456 bytes)
[S3Service] Image uploaded successfully: https://...
✅ [RecipesController] Upload successful
✅ [RecipesController] Image URL: https://...
```

## Mobile App Integration

Your React Native app can now upload images:

```typescript
// From imageUploadService.ts
async uploadRecipeImage(imageUri: string, token: string) {
  return this.uploadImage(imageUri, '/api/recipes/upload-image', token);
}
```

The endpoint:
- ✅ Exists at `/api/recipes/upload-image`
- ✅ Accepts multipart/form-data
- ✅ Returns S3 URL
- ✅ Works with your existing app code

## Summary

**Before:**
- ❌ `POST /api/recipes/upload-image` → 404 Not Found
- ❌ Mobile app couldn't upload images

**After:**
- ✅ `POST /api/recipes/upload-image` → 200 OK (with file) or 400 Bad Request (without file)
- ✅ Mobile app can upload images
- ✅ Images stored in S3
- ✅ Public URLs returned

**Status:** Ready to deploy! 🚀
