import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private users: User[] = [];

  async create(registerDto: RegisterDto): Promise<User> {
    const passwordHash = await bcrypt.hash(registerDto.name, 10);

    const user: User = {
      _id: Date.now().toString(),
      name: registerDto.name,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  async findOne(id: string): Promise<User> {
    const user = this.users.find((u) => u._id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByName(name: string): Promise<User | undefined> {
    return this.users.find((u) => u.name.toLowerCase() === name.toLowerCase());
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, { ...updateData, updatedAt: new Date() });
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.lastLoginAt = new Date();
  }

  async remove(id: string): Promise<void> {
    const index = this.users.findIndex((u) => u._id === id);
    if (index === -1) {
      throw new NotFoundException('User not found');
    }
    this.users.splice(index, 1);
  }

  async validateUser(name: string): Promise<User | null> {
    const user = await this.findByName(name);
    if (user) {
      return user;
    }
    return null;
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

