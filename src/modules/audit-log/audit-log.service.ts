import { Injectable, Scope } from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog, AuditLogDocument } from './entities/audit-log.schema';
import { paginate } from '@/common/helpers/paginationHelper';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import aqp from 'api-query-params';
import { RequestContextService } from '@/common/context/request-context';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly requestContext: RequestContextService,
  ) {}

  create(createAuditLogDto: CreateAuditLogDto) {
    return this.auditLogModel.create(createAuditLogDto);
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    return paginate<AuditLog>(
      this.auditLogModel,
      filter,
      sort,
      [],
      current,
      pageSize,
    );
  }
}
