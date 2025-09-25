import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department } from './schema/department.schema';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import aqp from 'api-query-params';
import { toDto } from '@/common/helpers/transformHelper';
import { paginate } from '@/common/helpers/paginationHelper';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name) private departmentModel: Model<Department>,
  ) {}

  async create(createDto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    await this.checkDuplicateName(createDto.name);

    const department = await this.departmentModel.create(createDto);
    return toDto(DepartmentResponseDto, department);
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    const selectFields = getDtoSelect(DepartmentResponseDto);

    return paginate<DepartmentResponseDto>(
      this.departmentModel,
      filter,
      sort,
      selectFields,
      current,
      pageSize,
    );
  }

  async findOne(id: string): Promise<DepartmentResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        message: 'Department not found',
        errorCode: 'DEPARTMENT_NOT_FOUND',
      });
    }

    const selectFields = getDtoSelect(DepartmentResponseDto).join(' ');
    const department = await this.departmentModel.findById(id).select(selectFields).exec();

    if (!department) {
      throw new NotFoundException({
        message: 'Department not found',
        errorCode: 'DEPARTMENT_NOT_FOUND',
      });
    }

    return toDto(DepartmentResponseDto, department);
  }

  async update(id: string, updateDto: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
    if (updateDto.name) {
      await this.checkDuplicateName(updateDto.name, id);
    }

    const department = await this.departmentModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!department) {
      throw new NotFoundException({
        message: 'Department not found',
        errorCode: 'DEPARTMENT_NOT_FOUND',
      });
    }

    return toDto(DepartmentResponseDto, department);
  }

  async remove(id: string): Promise<DepartmentResponseDto> {
    const department = await this.departmentModel.findByIdAndDelete(id).exec();
    if (!department) {
      throw new NotFoundException({
        message: 'Department not found',
        errorCode: 'DEPARTMENT_NOT_FOUND',
      });
    }
    return toDto(DepartmentResponseDto, department);
  }

  private async checkDuplicateName(name?: string, excludeId?: string) {
    const filter: any = { $or: [] };
    if (name) filter.$or.push({ name });

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    if (filter.$or.length === 0) return;

    const existing = await this.departmentModel.findOne(filter);
    if (existing) {
      throw new ConflictException({
        message: 'Department name already exists',
        errorCode: 'DEPARTMENT_EXISTS',
      });
    }
  }
}
