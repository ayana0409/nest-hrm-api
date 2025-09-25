import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee } from './schema/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { toDto } from '@/common/helpers/transformHelper';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import { paginate } from '@/common/helpers/paginationHelper';
import aqp from 'api-query-params';
import { Department } from '../department/schema/department.schema';
import { Position } from '../position/schema/position.schema';
import { validateForeignKey } from '@/common/helpers/validateHelper';
import { EmpPositionDto } from './dto/emp-position.dto';
import { EmpDepartmentDto } from './dto/emp-department.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Position.name) private positionModel: Model<Position>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,) { }

  async create(createDto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    const exists = await this.employeeModel.findOne({ email: createDto.email });
    if (exists) {
      throw new ConflictException('Email already exists');
    }
    await validateForeignKey(this.positionModel, createDto.positionId);
    await validateForeignKey(this.departmentModel, createDto.departmentId);

    const employee = await this.employeeModel.create(createDto);
    return toDto(EmployeeResponseDto, employee);
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    const selectFields = getDtoSelect(EmployeeResponseDto);
    return paginate<EmployeeResponseDto>(
      this.employeeModel,
      filter,
      sort,
      selectFields,
      current,
      pageSize,
      {
        populate: [
          { path: 'positionId', select: getDtoSelect(EmpPositionDto) },
          { path: 'departmentId', select: getDtoSelect(EmpDepartmentDto) },
        ],
        lean: false,
        dtoClass: EmployeeResponseDto
      }
    );
  }

  async findOne(id: string): Promise<EmployeeResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Employee not found');
    }

    const selectFields = getDtoSelect(EmployeeResponseDto).join(' ');
    const employee = await this.employeeModel.findById(id)
      .select(selectFields)
      .populate([
        { path: 'positionId', select: getDtoSelect(EmpPositionDto) },
        { path: 'departmentId', select: getDtoSelect(EmpDepartmentDto) },
      ])
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return toDto(EmployeeResponseDto, employee);
  }

  async update(id: string, updateDto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    if (updateDto.email) {
      const exists = await this.employeeModel.findOne({ email: updateDto.email, _id: { $ne: id } });
      if (exists) throw new ConflictException('Email already exists');
    }

    const employee = await this.employeeModel.findByIdAndUpdate(id, updateDto, { new: true })
      .populate(['positionId', 'departmentId'])
      .exec();

    if (!employee) throw new NotFoundException('Employee not found');

    return toDto(EmployeeResponseDto, employee);
  }

  async remove(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!employee) throw new NotFoundException('Employee not found');
    return toDto(EmployeeResponseDto, employee);
  }
}
