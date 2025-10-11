import { Model } from 'mongoose';
import { toDto } from './transformHelper';
import { PipelineStage } from 'mongoose';

export interface PaginationResult<T> {
  items: T[];
  totalItem: number;
  totalPage: number;
  current: number;
  pageSize: number;
}

export async function paginate<T>(
  model: Model<any>,
  filter: Record<string, any>,
  sort: Record<string, any> = {},
  selectFields: string[] = [],
  current = 1,
  pageSize = 10,
  options?: {
    populate?: Parameters<typeof Model.prototype.populate>[0];
    lean?: boolean;
    dtoClass?: any;
  },
): Promise<PaginationResult<T>> {
  const totalItem = await model.countDocuments(filter).exec();
  const totalPage = Math.ceil(totalItem / pageSize);
  const skip = (current - 1) * pageSize;

  let query = model
    .find(filter)
    .limit(pageSize)
    .skip(skip)
    .select(selectFields.join(' '))
    .sort(sort);

  if (options?.populate) {
    query = query.populate(options.populate as any);
  }

  if (options?.lean) {
    query = query.lean<T[]>();
  }

  const items = await query.exec();

  if (options?.dtoClass) {
    items.map((item, index) => (items[index] = toDto(options.dtoClass, item)));
  }

  return {
    items,
    totalItem,
    totalPage,
    current,
    pageSize,
  };
}

export async function paginateAggregate<T>(
  model: Model<any>,
  pipeline: PipelineStage[], // pipeline gốc
  current = 1,
  pageSize = 10,
  options?: {
    dtoClass?: any;
    lean?: boolean;
  },
): Promise<PaginationResult<T>> {
  const skip = (current - 1) * pageSize;

  // Đếm tổng số item (dùng $count)
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await model.aggregate(countPipeline).exec();
  const totalItem = countResult[0]?.total || 0;
  const totalPage = Math.ceil(totalItem / pageSize);

  // Query với phân trang
  const dataPipeline = [...pipeline, { $skip: skip }, { $limit: pageSize }];

  let items = await model.aggregate(dataPipeline).exec();

  if (options?.lean) {
    // aggregate vốn trả về plain object rồi, nên thường không cần lean
    items = items as T[];
  }

  if (options?.dtoClass) {
    items.map((item, index) => (items[index] = toDto(options.dtoClass, item)));
  }

  return {
    items,
    totalItem,
    totalPage,
    current,
    pageSize,
  };
}
