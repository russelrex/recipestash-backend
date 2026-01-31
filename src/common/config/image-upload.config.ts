export const ImageUploadConfig = {
  // Allowed image formats
  allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],

  // File size limits (in bytes)
  maxFileSize: 5 * 1024 * 1024, // 5MB
  featuredImageMaxSize: 5 * 1024 * 1024, // 5MB for featured image
  additionalImageMaxSize: 3 * 1024 * 1024, // 3MB for additional images

  // Image dimensions
  maxWidth: 2048,
  maxHeight: 2048,
  featuredImageMaxWidth: 2048,
  featuredImageMaxHeight: 2048,
  additionalImageMaxWidth: 1920,
  additionalImageMaxHeight: 1920,

  // Thumbnail settings
  thumbnailWidth: 400,
  thumbnailHeight: 400,

  // Quality settings
  defaultQuality: 85, // 0-100
  thumbnailQuality: 75,

  // Upload limits
  maxAdditionalImages: 5,

  // S3 folder structure
  folders: {
    featuredImages: 'recipes/featured',
    additionalImages: 'recipes/images',
    thumbnails: 'recipes/thumbnails',
    posts: 'posts/images',
    profiles: 'profiles/avatars',
  },
};

export const ImageUploadMessages = {
  invalidFormat: 'Invalid image format. Only JPEG, PNG, and WebP are allowed.',
  fileTooLarge: (maxSize: number) =>
    `File size exceeds the maximum limit of ${maxSize / (1024 * 1024)}MB.`,
  featuredImageTooLarge: `Featured image size exceeds ${ImageUploadConfig.featuredImageMaxSize / (1024 * 1024)}MB.`,
  additionalImageTooLarge: `Additional image size exceeds ${ImageUploadConfig.additionalImageMaxSize / (1024 * 1024)}MB.`,
  tooManyImages: `You can only upload up to ${ImageUploadConfig.maxAdditionalImages} additional images.`,
  dimensionsTooLarge: (maxWidth: number, maxHeight: number) =>
    `Image dimensions exceed the maximum size of ${maxWidth}x${maxHeight}px.`,
  uploadFailed: 'Failed to upload image. Please try again.',
};
