import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { Employee, EmployeeSchema } from './schema/employee.schema';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Department,
  DepartmentSchema,
} from '../department/schema/department.schema';
import { Position, PositionSchema } from '../position/schema/position.schema';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Employee.name,
        useFactory: () => {
          const schema = EmployeeSchema;
          return schema;
        },
      },
      {
        name: Department.name,
        useFactory: () => {
          const schema = DepartmentSchema;
          return schema;
        },
      },
      {
        name: Position.name,
        useFactory: () => {
          const schema = PositionSchema;
          return schema;
        },
      },
    ]),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
