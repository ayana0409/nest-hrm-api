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
import { redisStore } from 'cache-manager-redis-yet';

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
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
        console.log('Redis URL:', redisUrl);
        try {
          const store = await redisStore({
            url: redisUrl,
            ttl: parseInt(
              configService.get<string>('CACHE_TIME_LIFE') || '86400000',
            ),
          });
          console.log('Redis store initialized:', store ? 'Success' : 'Failed');
          return {
            store,
            ttl: parseInt(
              configService.get<string>('CACHE_TIME_LIFE') || '86400000',
            ),
            max: parseInt(configService.get<string>('CACHE_MAX_ITEM') || '100'),
          };
        } catch (error) {
          console.error('Error initializing Redis store:', error);
          throw error;
        }
      },
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
