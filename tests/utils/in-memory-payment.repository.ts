import { Payment } from '../../src/domain/entities/payment.entity';
import {
  PaymentFilters,
  PaymentRepository,
} from '../../src/domain/interfaces/payment.interface';

export class InMemoryPaymentRepository extends PaymentRepository {
  private readonly items = new Map<string, Payment>();

  create(payment: Payment): Promise<void> {
    this.items.set(payment.id, Payment.restore(payment.toJSON()));
    return Promise.resolve();
  }

  update(payment: Payment): Promise<void> {
    if (this.items.has(payment.id)) {
      this.items.set(payment.id, Payment.restore(payment.toJSON()));
    }
    return Promise.resolve();
  }

  findById(id: string): Promise<Payment | null> {
    const payment = this.items.get(id);
    return Promise.resolve(payment ? Payment.restore(payment.toJSON()) : null);
  }

  findAll(filters: PaymentFilters): Promise<Payment[]> {
    const payments = [...this.items.values()].filter(
      (payment) =>
        (!filters.cpf || payment.cpf === filters.cpf) &&
        (!filters.paymentMethod ||
          payment.paymentMethod === filters.paymentMethod),
    );
    return Promise.resolve(payments);
  }
}
