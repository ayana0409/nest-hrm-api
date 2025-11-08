import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';

export enum LeaveRequestEventEnum {
  Create = 'leave-request.created',
  Update = 'leave-request.updated',
  Delete = 'leave-request.deleted',
}

export class LeaveRequestUpdatedPayload {
  constructor(
    public readonly leaveRequestId: string,
    public readonly employeeId: string,
    public readonly status: LeaveRequestStatus,
  ) {}
}
