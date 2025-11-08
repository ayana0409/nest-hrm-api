import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as faceapi from 'face-api.js';
import * as canvas from 'canvas';
import { EmployeeStatusEnum } from '@/common/enum/employee-status..enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  Employee,
  EmployeeDocument,
} from '@/modules/employee/schema/employee.schema';
import { loadImage } from 'canvas';
import { resizeImage } from '@/common/helpers/image-helper';
import { EmployeeEventEnum } from '@/common/event/employee.event';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EmpFaceService implements OnModuleInit {
  private readonly CACHE_TTL = 3600 * 1000; // 1 giờ
  private readonly CACHE_KEY = 'face_descriptor_';

  private faceMatcher: faceapi.FaceMatcher | null = null;
  private lastCacheUpdate: number = 0;

  last: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await this.loadModels();
    await this.buildFaceMatcher();
  }

  async loadModels() {
    faceapi.env.monkeyPatch({
      Canvas: canvas.Canvas as any,
      Image: canvas.Image as any,
      ImageData: canvas.ImageData as any,
    });
    // await faceapi.nets.tinyFaceDetector.loadFromDisk('./src/models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./src/models');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./src/models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./src/models');
  }

  private async buildFaceMatcher(force: boolean = false) {
    // Check if faceMatcher is valid and not expired
    if (
      !force &&
      this.faceMatcher &&
      Date.now() - this.lastCacheUpdate < this.CACHE_TTL
    ) {
      return this.faceMatcher;
    }

    const employees = await this.employeeModel
      .find({ status: EmployeeStatusEnum.Active })
      .exec();

    const labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];

    for (const employee of employees) {
      const cacheKey = this.CACHE_KEY + employee._id.toString();
      const descriptors = await this.cacheManager.get<string>(cacheKey);

      if (descriptors) {
        try {
          const parsed = JSON.parse(descriptors);
          // Validate parsed data structure
          if (parsed && Array.isArray(parsed.descriptors)) {
            labeledDescriptors.push(
              new faceapi.LabeledFaceDescriptors(
                employee._id.toString(),
                parsed.descriptors.map((d: number[]) => new Float32Array(d)),
              ),
            );
          }
        } catch (error) {
          console.warn(`Failed to parse cache for ${cacheKey}:`, error);
        }
      } else if (
        Array.isArray(employee.faceDescriptors) &&
        employee.faceDescriptors.length > 0
      ) {
        const descriptorData = {
          id: employee._id.toString(),
          fullName: employee.fullName || '',
          descriptors: employee.faceDescriptors.map((d) => Array.from(d)),
        };
        await this.cacheManager.set(cacheKey, JSON.stringify(descriptorData));
        labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(
            employee._id.toString(),
            employee.faceDescriptors.map((d) => new Float32Array(d)),
          ),
        );
      }
    }

    if (labeledDescriptors.length === 0) {
      console.warn(
        '⚠️ No employees with descriptors, cannot build FaceMatcher',
      );
      this.faceMatcher = null;
      return null;
    }

    this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
    this.lastCacheUpdate = Date.now();
    return this.faceMatcher;
  }

  async detectFace(imageBase64: string) {
    if (!imageBase64 || !imageBase64.includes(',')) {
      throw new Error('Invalid base64 image format');
    }

    // Tách base64 và chuyển thành buffer
    const imgBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
    const img = await loadImage(imgBuffer);

    // Resize ảnh xuống 300px để tăng tốc độ xử lý
    const resizedImg = await resizeImage(img, 480);

    // Sử dụng tinyFaceDetector để tối ưu hiệu suất
    // const detection = await faceapi
    //   .detectSingleFace(
    //     resizedImg as any,
    //     new faceapi.TinyFaceDetectorOptions({
    //       scoreThreshold: 0.3,
    //       inputSize: 416,
    //     }),
    //   )
    //   .withFaceLandmarks()
    //   .withFaceDescriptor();

    const detection = await faceapi
      .detectSingleFace(
        resizedImg as any,
        new faceapi.SsdMobilenetv1Options({
          minConfidence: 0.55,
          maxResults: 1,
        }),
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new BadRequestException('No face detected');
    }
    return detection;
  }

  async findBestMatchEmp(imageBase64: string) {
    const detection = await this.detectFace(imageBase64);
    const matcher = await this.buildFaceMatcher();
    if (!matcher) {
      throw new Error('No matcher available');
    }

    let empId: string | null = null;
    let fullName = 'Unknown';
    const bestMatch = matcher.findBestMatch(detection.descriptor);
    if (bestMatch.label === 'unknown') {
      return { employeeId: empId, fullName };
    }

    empId = bestMatch.label;
    // Lấy fullName từ cache hoặc database
    const cacheKey = this.CACHE_KEY + empId;
    const cachedData = await this.cacheManager.get<string>(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        fullName = parsed.fullName || 'Unknown';
      } catch (error) {
        console.warn(`Failed to parse cache for ${cacheKey}:`, error);
      }
    } else {
      // Fallback: Lấy từ database nếu cache không có
      const employee = await this.employeeModel.findById(empId).exec();
      fullName = employee?.fullName || 'Unknown';
    }
    return { employeeId: empId, fullName };
  }

  @OnEvent(EmployeeEventEnum.Create)
  @OnEvent(EmployeeEventEnum.Update)
  private async handleEmployeeCreatedOrUpdated(payload: {
    employeeId: string;
  }) {
    const employee = await this.employeeModel
      .findById(payload.employeeId)
      .exec();
    if (!employee) return;

    const cacheKey = this.CACHE_KEY + employee._id.toString();

    // Cập nhật cache
    if (
      Array.isArray(employee.faceDescriptors) &&
      employee.faceDescriptors.length > 0
    ) {
      const descriptorData = {
        id: employee._id.toString(),
        fullName: employee.fullName,
        descriptors: employee.faceDescriptors.map((d) => Array.from(d)),
      };
      await this.cacheManager.set(cacheKey, JSON.stringify(descriptorData));
    } else {
      // Xóa cache nếu employee không còn faceDescriptors
      await this.cacheManager.del(cacheKey);
    }

    // Làm mới faceMatcher
    await this.buildFaceMatcher(true);
  }

  @OnEvent(EmployeeEventEnum.Delete)
  private async handleEmployeeDeleted(payload: { employeeId: string }) {
    const cacheKey = this.CACHE_KEY + payload.employeeId;

    // Xóa cache của employee
    await this.cacheManager.del(cacheKey);

    // Làm mới faceMatcher
    await this.buildFaceMatcher(true);
  }
}
