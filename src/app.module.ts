import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentModule } from './modules/department/department.module';
import { PositionModule } from './modules/position/position.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveRequestModule } from './modules/leave-request/leave-request.module';
import { SalaryModule } from './modules/salary/salary.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule], // Import ConfigModule để inject ConfigService
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ttl: 600000, //parseInt(configService.get<string>('CACHE_TIME_LIFE') || '30000'),
        max: parseInt(configService.get<string>('CACHE_MAX_ITEM') || '100'),
      }),
    }),
    DepartmentModule,
    PositionModule,
    EmployeeModule,
    AttendanceModule,
    LeaveRequestModule,
    SalaryModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
