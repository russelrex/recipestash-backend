import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    const passwordHash = await bcrypt.hash(registerDto.name, 10);

    const createdUser = new this.userModel({
      name: registerDto.name,
      passwordHash,
    });

    return createdUser.save();
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

  async validateUser(name: string): Promise<User | null> {
    const user = await this.findByName(name);
    if (user) {
      return user;
    }
    return null;
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitized } = (user as any).toObject
      ? (user as any).toObject()
      : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return sanitized;
  }
}

