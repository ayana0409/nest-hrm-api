import { Module } from '@nestjs/common';
import { PositionService } from './position.service';
import { PositionController } from './position.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Position, PositionSchema } from './schema/position.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Position.name, schema: PositionSchema }]),
  ],
  controllers: [PositionController],
  providers: [PositionService],
})
export class PositionModule {}
