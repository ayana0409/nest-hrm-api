export class CreateAuditLogDto {
  userId?: string;
  action: string;
  entityId?: string;
  timestamp?: Date;
  details?: string;
}
