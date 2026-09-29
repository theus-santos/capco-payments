import { Payment } from '../../src/domain/entities/payment.entity';
import { PaymentGatewayError } from '../../src/domain/errors/payment.error';
import {
  PaymentCheckout,
  PaymentGateway,
} from '../../src/domain/interfaces/payment.interface';

export class FakePaymentGateway extends PaymentGateway {
  shouldFail = false;

  createCheckout(payment: Payment): Promise<PaymentCheckout> {
    if (this.shouldFail) {
      return Promise.reject(new PaymentGatewayError('unavailable'));
    }

    return Promise.resolve({
      preferenceId: `pref-${payment.id}`,
      checkoutUrl: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-${payment.id}`,
    });
  }
}
