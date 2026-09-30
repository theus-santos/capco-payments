import { PaymentStatus } from '../domain/enums/payment.enum';
import type { PaymentCheckout } from '../domain/interfaces/payment.interface';

export interface CheckoutState {
  checkout: PaymentCheckout | null;
  failed: boolean;
}

export interface PaymentActivities {
  createCheckout(paymentId: string): Promise<PaymentCheckout>;
  checkPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  completePayment(paymentId: string, status: PaymentStatus): Promise<void>;
}
