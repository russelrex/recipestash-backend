import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { S3Service } from '../../common/services/s3.service';
import { ImageUploadConfig } from '../../common/config/image-upload.config';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly s3Service: S3Service,
  ) {}

  async create(name: string, email: string, password: string): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const createdUser = new this.userModel({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return createdUser.save();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .exec();
    return user ?? undefined;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneReferenced(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByName(name: string): Promise<User | undefined> {
    const user = await this.userModel
      .findOne({ name: new RegExp(`^${name}$`, 'i') })
      .exec();
    return user ?? undefined;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { ...updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    const result = await this.userModel
      .findByIdAndUpdate(id, { lastLoginAt: new Date() })
      .exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async remove(id: string): Promise<void> {
    const res = await this.userModel.deleteOne({ _id: id }).exec();
    if (!res.deletedCount) {
      throw new NotFoundException('User not found');
    }
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitized } = (user as any).toObject
      ? (user as any).toObject()
      : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return sanitized;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findOne(userId);

    const updateData: Partial<User> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.bio !== undefined) {
      updateData.bio = dto.bio || undefined; // '' → clear
    }

    if (dto.avatarUrl !== undefined) {
      if (dto.avatarUrl === '') {
        // clear
        if (user.avatarUrl) {
          try {
            await this.s3Service.deleteFile(user.avatarUrl);
          } catch (_e) {
            // best-effort deletion
          }
        }
        updateData.avatarUrl = undefined;
      } else if (dto.avatarUrl.startsWith('data:image')) {
        // new image
        if (user.avatarUrl) {
          try {
            await this.s3Service.deleteFile(user.avatarUrl);
          } catch (_e) {
            // best-effort deletion
          }
        }
        updateData.avatarUrl = await this.s3Service.uploadImage(
          dto.avatarUrl,
          ImageUploadConfig.folders.profiles,
          'additional',
        );
      }
      // else: unchanged URL – do nothing
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async updatePreferences(userId: string, prefs: {
    notificationsEnabled?: boolean;
    dietaryRestrictions?: string[];
    measurementUnit?: 'metric' | 'imperial';
    privacyProfilePublic?: boolean;
  }): Promise<User> {
    const user = await this.findOne(userId);
    const updateData: Partial<User> = {};

    if (prefs.notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = prefs.notificationsEnabled;
    }
    if (prefs.dietaryRestrictions !== undefined) {
      updateData.dietaryRestrictions = prefs.dietaryRestrictions;
    }
    if (prefs.measurementUnit !== undefined) {
      updateData.measurementUnit = prefs.measurementUnit;
    }
    if (prefs.privacyProfilePublic !== undefined) {
      updateData.privacyProfilePublic = prefs.privacyProfilePublic;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}

