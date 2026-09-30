import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
