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

    // Build subscription object from flat fields
    const isPremium = doc.plan === 'premium' || doc.isPremium === true;
    const tier = doc.plan === 'premium' ? 'premium' : 'free';

    this.subscription = {
      isPremium,
      tier,
      startDate: doc.subscriptionStartsAt,
      expiryDate: doc.subscriptionEndsAt,
      status: doc.subscriptionStatus ?? 'inactive',
      paymentMethod: undefined,
      subscriptionId: doc.customerId,
    };

    this.isPremium = isPremium;
    this.subscriptionTier = tier;

    this.createdAt = doc.createdAt;
    this.updatedAt = doc.updatedAt;
  }
}
