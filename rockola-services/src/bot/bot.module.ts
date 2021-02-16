import { ListModule } from './../list/list.module';
import { Module } from '@nestjs/common';
import { BotService } from './bot.service';

@Module({
  imports: [ListModule],
  providers: [BotService]
})
export class BotModule {}
