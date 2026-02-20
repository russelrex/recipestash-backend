export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  avatarUrl?: string;

  // Subscription info (nested object)
  subscription?: {
    isPremium: boolean;
    tier: string;
    startDate?: Date;
    expiryDate?: Date;
    status?: string;
    paymentMethod?: string;
    subscriptionId?: string;
  };

  // Legacy fields for backward compatibility (derived from subscription)
  isPremium?: boolean;
  subscriptionTier?: string;

  createdAt?: Date;
  updatedAt?: Date;

  constructor(user: any) {
    const doc = user?.toObject ? user.toObject() : user;
    this.id = doc._id?.toString() ?? doc.id;
    this.name = doc.name;
    this.email = doc.email;
    this.profilePicture = doc.profilePicture;
    this.bio = doc.bio;
    this.avatarUrl = doc.avatarUrl;

    // Handle nested subscription object
    if (doc.subscription) {
      const subscriptionIsPremium = doc.subscription.isPremium ?? false;
      const subscriptionTier = doc.subscription.tier ?? 'free';
      this.subscription = {
        isPremium: subscriptionIsPremium,
        tier: subscriptionTier,
        startDate: doc.subscription.startDate,
        expiryDate: doc.subscription.expiryDate,
        status: doc.subscription.status ?? 'active',
        paymentMethod: doc.subscription.paymentMethod,
        subscriptionId: doc.subscription.subscriptionId,
      };
      // Legacy fields for backward compatibility
      this.isPremium = subscriptionIsPremium;
      this.subscriptionTier = subscriptionTier;
    } else {
      // Fallback for old schema (if migration hasn't run)
      const fallbackIsPremium = doc.isPremium ?? false;
      const fallbackTier = doc.subscriptionTier ?? 'free';
      this.isPremium = fallbackIsPremium;
      this.subscriptionTier = fallbackTier;
      this.subscription = {
        isPremium: fallbackIsPremium,
        tier: fallbackTier,
        status: 'active',
      };
    }

    this.createdAt = doc.createdAt;
    this.updatedAt = doc.updatedAt;
  }
}
