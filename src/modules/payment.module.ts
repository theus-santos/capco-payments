import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentRepository } from '../domain/interfaces/payment.interface';
import { PaymentModel } from '../models/payment.model';
import { SequelizePaymentRepository } from '../repositories/payment.repository';

@Module({
  imports: [SequelizeModule.forFeature([PaymentModel])],
  providers: [
    {
      provide: PaymentRepository,
      useClass: SequelizePaymentRepository,
    },
  ],
  exports: [PaymentRepository],
})
export class PaymentModule {}
