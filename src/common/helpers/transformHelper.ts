import { plainToInstance, ClassConstructor } from 'class-transformer';

export function toDto<T, V>(dtoClass: ClassConstructor<T>, plain: V): T {
  return plainToInstance(dtoClass, plain, {
    excludeExtraneousValues: true,
  });
}
