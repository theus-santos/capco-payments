import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './modules/database.module';
import { PaymentModule } from './modules/payment.module';
import { TemporalModule } from './modules/temporal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    TemporalModule,
    PaymentModule,
  ],
})
export class AppModule {}
