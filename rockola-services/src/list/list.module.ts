import { Module } from '@nestjs/common';
import { ListService } from './list.service';

@Module({
  providers: [ListService],
  exports: [ListService]
})
export class ListModule {}
