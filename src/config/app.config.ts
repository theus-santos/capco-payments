import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from '../utils/domain-exception.filter';

export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
}
