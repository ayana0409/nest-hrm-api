import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model, Types } from 'mongoose';
import { UserResponseDto } from './dto/user-response.dto';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import { PasswordHelper } from '@/common/helpers/passwordHelper';
import aqp from 'api-query-params';
import { toDto } from '@/common/helpers/transformHelper';
import { paginate } from '@/common/helpers/paginationHelper';
import { EmployeeResponseDto } from '../employee/dto/employee-response.dto';
import * as employeeSchema from '../employee/schema/employee.schema';
import { UserEmployeeDto } from './dto/user-employee.dto';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEvent, AuditAction } from '@/common/event/audit-log.event';
import { data } from '@tensorflow/tfjs';

@Injectable()
export class UserService {
  private readonly MODULE_NAME = 'user';
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(employeeSchema.Employee.name)
    private employeeModel: employeeSchema.EmployeeModel,
    private readonly configService: ConfigService,
    private readonly passwordHelper: PasswordHelper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.employeeId)
      await this.employeeModel.checkExist(createUserDto.employeeId);

    await this.validatePassword(createUserDto.password);
    // Hash the password before saving
    createUserDto.password = await this.passwordHelper.hashPasswordAsync(
      createUserDto.password,
    );
    createUserDto.employeeId = new Types.ObjectId(createUserDto.employeeId);
    const user = await this.userModel.create(createUserDto);

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.CREATE,
      entityId: user._id,
      data: createUserDto,
    });

    return toDto(UserResponseDto, user);
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    const selectFields = getDtoSelect(UserResponseDto);

    return paginate<UserResponseDto>(
      this.userModel,
      filter,
      sort,
      selectFields,
      current,
      pageSize,
      {
        populate: [
          { path: 'employeeId', select: getDtoSelect(UserEmployeeDto) },
        ],
        lean: false,
        dtoClass: UserResponseDto,
      },
    );
  }

  async findOne(id: string): Promise<UserResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    const selectFields = getDtoSelect(UserResponseDto).join(' ');
    const user = await this.userModel
      .findById(id)
      .select(selectFields)
      .populate({
        path: 'employeeId',
        select: getDtoSelect(EmployeeResponseDto),
      })
      .exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return toDto(UserResponseDto, user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    if (updateUserDto.password)
      updateUserDto.password = await this.passwordHelper.hashPasswordAsync(
        updateUserDto.password,
      );
    if (updateUserDto.employeeId) {
      await this.employeeModel.checkExist(updateUserDto.employeeId);
      updateUserDto.employeeId = new Types.ObjectId(updateUserDto.employeeId);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: id,
      data: updateUserDto,
    });

    return toDto(UserResponseDto, user);
  }

  async remove(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.DELETE,
      entityId: id,
    });

    return toDto(UserResponseDto, user);
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username }).lean();
  }

  async changePassword(userId: string, newPassword: string) {
    await this.validatePassword(newPassword);
    const hashedPassword =
      await this.passwordHelper.hashPasswordAsync(newPassword);
    const result = await this.userModel
      .findByIdAndUpdate(userId, { password: hashedPassword }, { new: true })
      .exec();
    if (!result) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: result._id,
      data: 'change password',
    });

    return toDto(UserResponseDto, result);
  }

  async resetPassword(userId: string) {
    const defaultPassword =
      this.configService.get<string>('DEFAULT_PASSWORD') || 'Password@123';
    return this.changePassword(userId, defaultPassword);
  }

  async validatePassword(password: string) {
    const passwordPolicy =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordPolicy.test(password)) {
      throw new ConflictException({
        message:
          'Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.',
        errorCode: 'PASSWORD_POLICY_VIOLATION',
      });
    }
  }
}
