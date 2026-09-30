import { Payment } from '../../src/domain/entities/payment.entity';
import { PaymentGatewayError } from '../../src/domain/errors/payment.error';
import {
  GatewayTransaction,
  PaymentCheckout,
  PaymentGateway,
} from '../../src/domain/interfaces/payment.interface';

export class FakePaymentGateway extends PaymentGateway {
  shouldFail = false;
  readonly approvedPayments = new Set<string>();
  readonly transactions = new Map<string, GatewayTransaction>();

  createCheckout(payment: Payment): Promise<PaymentCheckout> {
    if (this.shouldFail) {
      return Promise.reject(new PaymentGatewayError('unavailable'));
    }

    return Promise.resolve({
      preferenceId: `pref-${payment.id}`,
      checkoutUrl: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-${payment.id}`,
    });
  }

  findTransaction(transactionId: string): Promise<GatewayTransaction> {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      return Promise.reject(new PaymentGatewayError('transaction not found'));
    }

    return Promise.resolve(transaction);
  }

  isPaymentApproved(paymentId: string): Promise<boolean> {
    return Promise.resolve(this.approvedPayments.has(paymentId));
  }
}
