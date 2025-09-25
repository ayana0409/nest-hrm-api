import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import { PasswordHelper } from '@/common/helpers/passwordHelper';
import aqp from 'api-query-params';
import { toDto } from '@/common/helpers/transformHelper';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>, 
    private readonly passwordHelper: PasswordHelper
  ) {}

  async create(createUserDto: CreateUserDto) {
    await this.checkDuplicateUsername(createUserDto.username);

    // Hash the password before saving
    createUserDto.password = await this.passwordHelper.hashPasswordAsync(createUserDto.password);
    const user = await this.userModel.create(createUserDto);

    return plainToInstance(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async findAll(query: string, current: number, pageSize: number) {
    const selectFields = getDtoSelect(UserResponseDto).join(' ');
    const { filter, sort } = aqp(query);
    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;

    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const totalItem = (await this.userModel.find(filter)).length;
    const totalPage = Math.ceil(totalItem / pageSize);

    const skip = (current - 1) * pageSize;

    const users = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .select(selectFields)
      .sort(sort as any);

    return  {users, totalItem, totalPage};
  }

  async findOne(id: string): Promise<UserResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    const selectFields = getDtoSelect(UserResponseDto).join(' ');
    const user = await this.userModel.findById(id).select(selectFields).exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return plainToInstance(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    if (updateUserDto.username)
      await this.checkDuplicateUsername(updateUserDto.username);
    if (updateUserDto.password)
      updateUserDto.password = await this.passwordHelper.hashPasswordAsync(updateUserDto.password);
    
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return plainToInstance(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<UserResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return plainToInstance(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  private async checkDuplicateUsername(username: string) {
    var existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      throw new ConflictException('Username already exists', 'USERNAME_EXISTS');
    }
  }
}

