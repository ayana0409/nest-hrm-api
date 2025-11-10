export class CreateAuditLogDto {
  userId?: string;
  username?: string;
  action: string;
  entityId?: string;
  timestamp?: Date;
  details?: string;
  module?: string;
}
