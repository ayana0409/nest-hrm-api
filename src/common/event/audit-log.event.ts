export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface AuditLogPayload {
  module: string; // ví dụ: 'Product', 'User'
  action: AuditAction;
  entityId: string;
  performedBy: string; // userId hoặc email
  data?: any; // dữ liệu chi tiết (optional)
  timestamp?: Date;
}
