import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
import { Employee } from '../employee/schema/employee.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private readonly passwordHelper: PasswordHelper
  ) { }

  async create(createUserDto: CreateUserDto) {
    await this.checkDuplicateUsername(createUserDto.username);
    if (createUserDto.employeeId)
      await this.checkExistingEmployee(createUserDto.employeeId);
    // Hash the password before saving
    createUserDto.password = await this.passwordHelper.hashPasswordAsync(createUserDto.password);
    const user = await this.userModel.create(createUserDto);

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
          { path: 'employeeId', select: getDtoSelect(EmployeeResponseDto) },
        ],
        lean: false,
        dtoClass: UserResponseDto
      }
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
    const user = await this.userModel.findById(id)
      .select(selectFields)
      .populate({ path: 'employeeId', select: getDtoSelect(EmployeeResponseDto) })
      .exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return toDto(UserResponseDto, user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    if (updateUserDto.username)
      await this.checkDuplicateUsername(updateUserDto.username);
    if (updateUserDto.password)
      updateUserDto.password = await this.passwordHelper.hashPasswordAsync(updateUserDto.password);
    if (updateUserDto.employeeId)
      await this.checkExistingEmployee(updateUserDto.employeeId);

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

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

    return toDto(UserResponseDto, user);
  }

  private async checkDuplicateUsername(username: string) {
    var existingUser = await this.userModel.findOne({ username });
    if (existingUser)
      throw new ConflictException('Username already exists', 'USERNAME_EXISTS');
  }

  private async checkExistingEmployee(employeeId: string) {
    var existingEmployee = await this.employeeModel.findById(employeeId);
    if (!existingEmployee)
      throw new NotFoundException('Employee not found', 'EMPLOYEE_NOT_FOUND');
  }
}

