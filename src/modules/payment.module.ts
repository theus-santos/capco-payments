import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentRepository } from '../domain/interfaces/payment.interface';
import { PaymentModel } from '../models/payment.model';
import { SequelizePaymentRepository } from '../repositories/payment.repository';
import { PaymentService } from '../services/payment.service';

@Module({
  imports: [SequelizeModule.forFeature([PaymentModel])],
  providers: [
    PaymentService,
    {
      provide: PaymentRepository,
      useClass: SequelizePaymentRepository,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
