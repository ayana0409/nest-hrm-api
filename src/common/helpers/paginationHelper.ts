import { Model } from 'mongoose';

export interface PaginationResult<T> {
  data: T[];
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

  const data = await query.exec();

  return {
    data,
    totalItem,
    totalPage,
    current,
    pageSize,
  };
}
