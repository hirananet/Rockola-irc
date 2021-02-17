import { YoutubeModule } from './../youtube/youtube.module';
import { Module } from '@nestjs/common';
import { ListService } from './list.service';

@Module({
  providers: [ListService],
  exports: [ListService],
  imports: [YoutubeModule]
})
export class ListModule {}
