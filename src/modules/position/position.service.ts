import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Position } from './schema/position.schema';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionResponseDto } from './dto/position-response.dto';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import aqp from 'api-query-params';
import { toDto } from '@/common/helpers/transformHelper';
import { paginate } from '@/common/helpers/paginationHelper';

@Injectable()
export class PositionService {
  constructor(
    @InjectModel(Position.name) private positionModel: Model<Position>,
  ) {}

  async create(createDto: CreatePositionDto): Promise<PositionResponseDto> {
    await this.checkDuplicateTitle(createDto.title);

    const position = await this.positionModel.create(createDto);
    return toDto(PositionResponseDto, position);
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    const selectFields = getDtoSelect(PositionResponseDto);

    return paginate<PositionResponseDto>(
      this.positionModel,
      filter,
      sort,
      selectFields,
      current,
      pageSize,
    );
  }

  async findOne(id: string): Promise<PositionResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        message: 'Position not found',
        errorCode: 'POSITION_NOT_FOUND',
      });
    }

    const selectFields = getDtoSelect(PositionResponseDto).join(' ');
    const position = await this.positionModel.findById(id).select(selectFields).exec();

    if (!position) {
      throw new NotFoundException({
        message: 'Position not found',
        errorCode: 'POSITION_NOT_FOUND',
      });
    }

    return toDto(PositionResponseDto, position);
  }

  async update(id: string, updateDto: UpdatePositionDto): Promise<PositionResponseDto> {
    if (updateDto.title) {
      await this.checkDuplicateTitle(updateDto.title, id);
    }

    const position = await this.positionModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!position) {
      throw new NotFoundException({
        message: 'Position not found',
        errorCode: 'POSITION_NOT_FOUND',
      });
    }

    return toDto(PositionResponseDto, position);
  }

  async remove(id: string): Promise<PositionResponseDto> {
    const position = await this.positionModel.findByIdAndDelete(id).exec();
    if (!position) {
      throw new NotFoundException({
        message: 'Position not found',
        errorCode: 'POSITION_NOT_FOUND',
      });
    }
    return toDto(PositionResponseDto, position);
  }

  private async checkDuplicateTitle(title: string, excludeId?: string) {
    const filter: any = { title };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existing = await this.positionModel.findOne(filter);
    if (existing) {
      throw new ConflictException({
        message: 'Position title already exists',
        errorCode: 'POSITION_EXISTS',
      });
    }
  }
}
