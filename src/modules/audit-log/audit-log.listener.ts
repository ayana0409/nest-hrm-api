import { AuditEvent, AuditLogPayload } from '@/common/event/audit-log.event';
import { Injectable, Scope } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from './audit-log.service';
import { RequestContextService } from '@/common/context/request-context';

@Injectable()
export class AuditLogListener {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly requestContext: RequestContextService,
  ) {}

  @OnEvent(AuditEvent.Log)
  async handle(payload: AuditLogPayload) {
    const userId = this.requestContext.getUserId();
    this.auditLogService.create({
      action: payload.action,
      entityId: payload.entityId,
      timestamp: new Date(),
      details: JSON.stringify(payload.data),
      userId: userId,
      module: payload.module,
      username: this.requestContext.getUsername(),
    });
  }
}
