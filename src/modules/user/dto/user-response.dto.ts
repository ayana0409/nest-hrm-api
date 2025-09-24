import { Exclude, Expose, Transform } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString()) // map từ ObjectId sang string
  _id: string;

  @Expose()
  readonly username: string;

  @Expose()
  readonly role?: string;

  @Expose()
  readonly active?: boolean;

  @Expose()
  readonly createdAt: Date;

  @Expose()
  readonly updatedAt: Date;

  @Exclude()
  readonly password: string;
}
