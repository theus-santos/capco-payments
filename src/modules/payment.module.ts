import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from '../controllers/payment.controller';
import {
  PaymentGateway,
  PaymentRepository,
} from '../domain/interfaces/payment.interface';
import { MercadoPagoGateway } from '../integrations/mercado-pago.gateway';
import { PaymentModel } from '../models/payment.model';
import { SequelizePaymentRepository } from '../repositories/payment.repository';
import { PaymentService } from '../services/payment.service';

@Module({
  imports: [SequelizeModule.forFeature([PaymentModel])],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      provide: PaymentRepository,
      useClass: SequelizePaymentRepository,
    },
    {
      provide: PaymentGateway,
      useClass: MercadoPagoGateway,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
