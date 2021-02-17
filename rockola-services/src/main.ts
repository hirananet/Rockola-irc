import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapterWithID } from './WsAdapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapterWithID(app));
  await app.listen(3000);
}
bootstrap();
