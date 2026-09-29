import { Injectable } from '@nestjs/common';
import { Payment } from '../domain/entities/payment.entity';
import { PaymentNotFoundError } from '../domain/errors/payment.error';
import {
  CreatePaymentProps,
  PaymentFilters,
  PaymentRepository,
  UpdatePaymentProps,
} from '../domain/interfaces/payment.interface';
import { Cpf } from '../domain/value-objects/cpf';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async create(data: CreatePaymentProps): Promise<Payment> {
    const payment = Payment.create(data);

    await this.paymentRepository.create(payment);

    return payment;
  }

  async update(id: string, data: UpdatePaymentProps): Promise<Payment> {
    const payment = await this.findById(id);

    payment.updateDetails({
      description: data.description,
      amount: data.amount,
    });

    if (data.status) {
      payment.changeStatus(data.status);
    }

    await this.paymentRepository.update(payment);

    return payment;
  }

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);

    if (!payment) {
      throw new PaymentNotFoundError(id);
    }

    return payment;
  }

  async findAll(filters: PaymentFilters): Promise<Payment[]> {
    return this.paymentRepository.findAll({
      cpf: filters.cpf ? Cpf.create(filters.cpf).value : undefined,
      paymentMethod: filters.paymentMethod,
    });
  }
}
