import { Module } from '@nestjs/common';
import { ListModule } from './list/list.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [ListModule, BotModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
