import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { SalaryService } from './salary.service';

@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.salaryService.delete(id);
  }

  @Get()
  findAll(
    @Query() query: string,
    @Query('current') current: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.salaryService.findAll(query, +current, +pageSize);
  }

  @Get('range')
  findByEmpIdRange(
    @Query('employeeId') employeeId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.salaryService.findDaysByEmpIdRange(employeeId, start, end);
  }

  @Post()
  async genForEmployee(
    @Body('employeeId') employeeId: string,
    @Body('month') month: string,
  ) {
    return this.salaryService.generateSalaryForEmployee(employeeId, month);
  }

  @Post('bulk')
  async generateSalariesForEmployees(
    @Body('month') month: string,
    @Body('employeeIds') employeeIds: string[],
  ) {
    return this.salaryService.generateSalaryForEmployees(employeeIds, month);
  }

  @Post('generate/:month')
  async generateSalariesForAllEmployees(@Param('month') month: string) {
    return this.salaryService.generateForAllEmoployees(month);
  }

  @Post('by-department')
  async generateSalariesByDepartment(
    @Body('departmentIds') departmentIds: string[],
    @Body('month') month: string,
  ) {
    return this.salaryService.generateForDepartment(departmentIds, month);
  }
}
