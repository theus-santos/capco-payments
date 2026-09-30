import { Injectable, Logger } from '@nestjs/common';
import { Payment } from '../domain/entities/payment.entity';
import { PaymentMethod, PaymentStatus } from '../domain/enums/payment.enum';
import {
  PaymentGatewayError,
  PaymentNotFoundError,
} from '../domain/errors/payment.error';
import {
  CreatePaymentProps,
  PaymentFilters,
  PaymentGateway,
  PaymentRepository,
  PaymentWorkflow,
  UpdatePaymentProps,
} from '../domain/interfaces/payment.interface';
import { Cpf } from '../domain/value-objects/cpf';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentWorkflow: PaymentWorkflow,
  ) {}

  async create(data: CreatePaymentProps): Promise<Payment> {
    const payment = Payment.create(data);

    await this.paymentRepository.create(payment);

    if (payment.paymentMethod === PaymentMethod.CREDIT_CARD) {
      await this.startCreditCardWorkflow(payment.id);
      return this.findById(payment.id);
    }

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

  async handleGatewayNotification(transactionId: string): Promise<void> {
    const transaction =
      await this.paymentGateway.findTransaction(transactionId);

    if (!transaction.paymentId) {
      this.logger.warn(`Transaction ${transactionId} has no payment reference`);
      return;
    }

    const notified = await this.paymentWorkflow.notify(transaction.paymentId);

    if (notified) return;

    const payment = await this.paymentRepository.findById(
      transaction.paymentId,
    );

    if (!payment) {
      this.logger.warn(`Payment ${transaction.paymentId} not found`);
      return;
    }

    if (
      transaction.status === PaymentStatus.PENDING ||
      transaction.status === payment.status
    ) {
      return;
    }

    if (payment.isFinal()) {
      this.logger.warn(
        `Payment ${payment.id} is already ${payment.status}, ignoring ${transaction.status}`,
      );
      return;
    }

    payment.changeStatus(transaction.status);
    await this.paymentRepository.update(payment);
  }

  private async startCreditCardWorkflow(paymentId: string): Promise<void> {
    try {
      await this.paymentWorkflow.start(paymentId);
    } catch (error) {
      const payment = await this.findById(paymentId);

      if (!payment.isFinal()) {
        payment.markAsFailed();
        await this.paymentRepository.update(payment);
      }

      if (error instanceof PaymentGatewayError) throw error;

      throw new PaymentGatewayError('payment workflow could not be started');
    }
  }
}
