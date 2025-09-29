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
  constructor(private readonly salaryService: SalaryService) { }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.salaryService.delete(id);
  }

  @Get()
  findAll(
    @Query() query: string,
    @Query('current') current: number,
    @Query('pageSize') pageSize: number) {
    return this.salaryService.findAll(query, +current, +pageSize);
  }

  @Post('employee/:employeeId/:month')
  async genForEmployee(@Param('employeeId') employeeId: string, @Param('month') month: string) {
    return this.salaryService.generateSalaryForEmployee(employeeId, month);
  }

  @Post('department/:departmentId/:month')
  async genForDepartment(@Param('departmentId') departmentId: string, @Param('month') month: string) {
    return this.salaryService.generateForDepartment(departmentId, month);
  }

}
