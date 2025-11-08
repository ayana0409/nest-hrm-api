import { AsyncLocalStorage } from 'async_hooks';

interface ContextStore {
  userId?: string;
  [key: string]: any;
}

const asyncLocalStorage = new AsyncLocalStorage<ContextStore>();

export class RequestContext {
  static run(callback: () => void) {
    asyncLocalStorage.run({}, callback);
  }

  static set(key: keyof ContextStore, value: any) {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store[key] = value;
    }
  }

  static get<T = any>(key: keyof ContextStore): T | undefined {
    const store = asyncLocalStorage.getStore();
    return store?.[key] as T;
  }

  static getUserId(): string | undefined {
    return this.get('userId');
  }
}
