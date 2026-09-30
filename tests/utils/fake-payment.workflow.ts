import { PaymentGatewayError } from '../../src/domain/errors/payment.error';
import {
  PaymentCheckout,
  PaymentGateway,
  PaymentRepository,
  PaymentWorkflow,
} from '../../src/domain/interfaces/payment.interface';
import { PaymentActivities } from '../../src/interfaces/payment-workflow.interface';
import { createPaymentActivities } from '../../src/workflows/payment.activities';
import { PaymentStatus } from '../../src/domain/enums/payment.enum';

export class FakePaymentWorkflow extends PaymentWorkflow {
  private readonly activities: PaymentActivities;

  constructor(
    paymentRepository: PaymentRepository,
    paymentGateway: PaymentGateway,
  ) {
    super();
    this.activities = createPaymentActivities(
      paymentRepository,
      paymentGateway,
    );
  }

  async start(paymentId: string): Promise<PaymentCheckout> {
    try {
      return await this.activities.createCheckout(paymentId);
    } catch {
      await this.activities.completePayment(paymentId, PaymentStatus.FAIL);
      throw new PaymentGatewayError('checkout could not be created');
    }
  }

  notify(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
