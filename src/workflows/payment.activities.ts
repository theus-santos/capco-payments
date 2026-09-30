import { PaymentStatus } from '../domain/enums/payment.enum';
import { PaymentNotFoundError } from '../domain/errors/payment.error';
import {
  PaymentGateway,
  PaymentRepository,
} from '../domain/interfaces/payment.interface';
import { PaymentActivities } from '../interfaces/payment-workflow.interface';

export function createPaymentActivities(
  paymentRepository: PaymentRepository,
  paymentGateway: PaymentGateway,
): PaymentActivities {
  const findPayment = async (paymentId: string) => {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new PaymentNotFoundError(paymentId);
    }

    return payment;
  };

  return {
    async createCheckout(paymentId) {
      const payment = await findPayment(paymentId);

      if (payment.preferenceId && payment.checkoutUrl) {
        return {
          preferenceId: payment.preferenceId,
          checkoutUrl: payment.checkoutUrl,
        };
      }

      const checkout = await paymentGateway.createCheckout(payment);
      payment.attachCheckout(checkout);
      await paymentRepository.update(payment);

      return checkout;
    },

    async checkPaymentStatus(paymentId) {
      const payment = await findPayment(paymentId);

      if (payment.isFinal()) {
        return payment.status;
      }

      const approved = await paymentGateway.isPaymentApproved(paymentId);

      return approved ? PaymentStatus.PAID : PaymentStatus.PENDING;
    },

    async completePayment(paymentId, status) {
      const payment = await findPayment(paymentId);

      if (payment.isFinal()) return;

      payment.changeStatus(status);
      await paymentRepository.update(payment);
    },
  };
}
