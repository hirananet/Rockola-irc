import { Module } from '@nestjs/common';
import { ListModule } from './list/list.module';
import { BotModule } from './bot/bot.module';
import { YoutubeModule } from './youtube/youtube.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [GatewayModule, ListModule, BotModule, YoutubeModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
