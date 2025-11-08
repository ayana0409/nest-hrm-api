import { AuditEvent, AuditLogPayload } from '@/common/event/audit-log.event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from './audit-log.service';
import { RequestContext } from '@/common/context/request-context';

@Injectable()
export class AuditLogListener {
  constructor(private readonly auditLogService: AuditLogService) {}

  @OnEvent(AuditEvent.Log)
  async handle(payload: AuditLogPayload) {
    // Ghi log vào DB, file, hoặc gửi đến hệ thống log tập trung
    console.log(
      `[${payload.timestamp}] ${payload.performedBy} ${payload.action} ${payload.module} ${payload.entityId}`,
    );

    this.auditLogService.create({
      action: payload.action,
      entityId: payload.entityId,
      timestamp: payload.timestamp,
      details: payload.data,
      userId: RequestContext.getUserId(),
    });
    // Hoặc gọi service để lưu vào bảng audit_logs
  }
}
