import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export async function validateForeignKey<T>(
  model: Model<T>,
  id: Types.ObjectId | undefined,
): Promise<void> {
  if (!id) return;

  const exists = await model.exists({ _id: id });
  if (!exists) {
    throw new NotFoundException(`${model.modelName} ${id} not found`);
  }
}

// file: src/common/validators/is-object-id.validator.ts

export function IsObjectId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isObjectId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) return true; // cho phép optional
          return Types.ObjectId.isValid(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Mongo ObjectId`;
        },
      },
    });
  };
}
