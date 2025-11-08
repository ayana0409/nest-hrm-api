export interface EmployeeEventPayload {
  employeeId: string;
}

export enum EmployeeEventEnum {
  Create = 'employee.created',
  Update = 'employee.updated',
  Delete = 'employee.deleted',
}
