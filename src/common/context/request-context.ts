import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextData {
  userId?: string;
  username?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly als = new AsyncLocalStorage<RequestContextData>();

  /** Tạo context cho mỗi request */
  run(callback: () => void) {
    const store: RequestContextData = {};
    RequestContextService.als.run(store, callback);
  }

  /** Đặt giá trị (userId, email, name, ...) */
  static set(key: keyof RequestContextData, value: any) {
    const store = RequestContextService.als.getStore();
    if (store) store[key] = value;
  }

  /** Lấy giá trị cụ thể */
  static get<T extends keyof RequestContextData>(
    key: T,
  ): RequestContextData[T] | undefined {
    const store = RequestContextService.als.getStore();
    return store ? store[key] : undefined;
  }

  /** Hàm tiện dụng */
  getUserId(): string | undefined {
    return RequestContextService.get('userId');
  }

  getUsername(): string | undefined {
    return RequestContextService.get('username');
  }
}
