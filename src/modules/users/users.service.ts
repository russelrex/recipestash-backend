import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
}

