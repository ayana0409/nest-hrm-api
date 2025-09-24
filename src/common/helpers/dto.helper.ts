import { instanceToPlain } from 'class-transformer';

export function getDtoSelect<T>(dto: new () => T): string[] {
  const plain = instanceToPlain(new dto(), { exposeUnsetFields: false }) as Record<string, any>;
  return Object.keys(plain);
}

