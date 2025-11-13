import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeeEventEnum } from '../../common/event/employee.event';
import { EmpFaceService } from '@/services/face/emp-face.service';
import { CloudinaryService } from '@/services/cloud/cloundinary.service';
import { resizeImageToRatio } from '@/common/helpers/image-helper';
import { AuditAction, AuditEvent } from '@/common/event/audit-log.event';
import { EmployeeStatusEnum } from '@/common/enum/employee-status..enum';
@Injectable()
export class EmployeeService {
  private readonly MODULE_NAME = 'employee';
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Position.name) private positionModel: Model<Position>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    private cloudinaryService: CloudinaryService,
    private readonly empFaceDetectionService: EmpFaceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createDto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    const exists = await this.employeeModel.findOne({ email: createDto.email });
    if (exists) {
      throw new ConflictException('Email already exists');
    }
    await validateForeignKey(this.positionModel, createDto.positionId);
    await validateForeignKey(this.departmentModel, createDto.departmentId);

    const employee = await this.employeeModel.create(createDto);
    this.eventEmitter.emit(EmployeeEventEnum.Create, {
      employeeId: employee._id.toString(),
    });

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.CREATE,
      entityId: employee._id,
      data: createDto,
    });

    return toDto(EmployeeResponseDto, employee);
  }

  async registerFace(employeeId: string, imageBase64: string) {
    try {
      let employee = await this.employeeModel.findById(employeeId).exec();
      if (!employee) throw new NotFoundException('Employee not found');
      const detection =
        await this.empFaceDetectionService.detectFace(imageBase64);

      const descriptor = Array.from(detection.descriptor); // Chuyển Float32Array thành array

      employee.faceDescriptors.push(descriptor);
      if (employee.faceDescriptors.length > 10) {
        employee.faceDescriptors.shift(); // Giới hạn tối đa 10 descriptors
      }

      await employee.save();
      this.eventEmitter.emit(EmployeeEventEnum.Update, {
        employeeId: employee._id.toString(),
      });

      this.eventEmitter.emit(AuditEvent.Log, {
        module: this.MODULE_NAME,
        action: AuditAction.CREATE,
        entityId: employeeId,
        data: 'Registor face',
      });
      return { success: true, message: 'Đăng ký khuôn mặt thành công' };
    } catch (error) {
      throw new BadRequestException('Lỗi đăng ký khuôn mặt: ' + error.message);
    }
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
        dtoClass: EmployeeResponseDto,
      },
    );
  }

  async findOne(id: string): Promise<EmployeeResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Employee not found');
    }

    const selectFields = getDtoSelect(EmployeeResponseDto).join(' ');
    const employee = await this.employeeModel
      .findById(id)
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

  async update(
    id: string,
    updateDto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    if (updateDto.email) {
      const exists = await this.employeeModel.findOne({
        email: updateDto.email,
        _id: { $ne: id },
      });
      if (exists) throw new ConflictException('Email already exists');
    }

    const employee = await this.employeeModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate(['positionId', 'departmentId'])
      .exec();

    if (!employee) throw new NotFoundException('Employee not found');

    this.eventEmitter.emit(EmployeeEventEnum.Update, {
      employeeId: employee._id.toString(),
    });

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: id,
      data: updateDto,
    });

    return toDto(EmployeeResponseDto, employee);
  }

  async updateAvatar(employeeId: string, base64Image: string): Promise<string> {
    if (!base64Image) throw new BadRequestException('base64Image is required.');
    const resizedBase64 = await resizeImageToRatio(base64Image, 500);
    const uploadResult =
      await this.cloudinaryService.uploadImage(resizedBase64);

    const employee = await this.employeeModel.findById(
      new Types.ObjectId(employeeId),
    );
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Xóa avatar cũ nếu tồn tại
    if (employee.avatarPublicId) {
      await this.cloudinaryService.deleteImage(employee.avatarPublicId);
    }

    // Cập nhật URL và publicId mới
    employee.avatarUrl = uploadResult.secure_url;
    employee.avatarPublicId = uploadResult.public_id;
    await employee.save();

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: employeeId,
      data: uploadResult.secure_url,
    });

    return uploadResult.secure_url;
  }

  async remove(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!employee) throw new NotFoundException('Employee not found');
    this.eventEmitter.emit(EmployeeEventEnum.Delete, {
      employeeId: employee._id.toString(),
    });

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.DELETE,
      entityId: id,
    });

    return toDto(EmployeeResponseDto, employee);
  }

  async countEmp(status: EmployeeStatusEnum) {
    return await this.employeeModel.find({ status }).countDocuments();
  }
}
