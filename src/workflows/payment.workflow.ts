import { condition, proxyActivities, setHandler } from '@temporalio/workflow';
import {
  CHECKOUT_ACTIVITY_OPTIONS,
  checkoutStateQuery,
  PAYMENT_EXPIRATION_MS,
  paymentNotificationSignal,
  STATUS_ACTIVITY_OPTIONS,
  STATUS_CHECK_INTERVAL_MS,
} from '../constants/payment-workflow.constant';
import { PaymentStatus } from '../domain/enums/payment.enum';
import type {
  CheckoutState,
  PaymentActivities,
} from '../interfaces/payment-workflow.interface';

const { createCheckout } = proxyActivities<PaymentActivities>(
  CHECKOUT_ACTIVITY_OPTIONS,
);

const { checkPaymentStatus, completePayment } =
  proxyActivities<PaymentActivities>(STATUS_ACTIVITY_OPTIONS);

export async function creditCardPaymentWorkflow(
  paymentId: string,
): Promise<PaymentStatus> {
  const state: CheckoutState = { checkout: null, failed: false };
  let notified = false;

  setHandler(checkoutStateQuery, () => state);
  setHandler(paymentNotificationSignal, () => {
    notified = true;
  });

  try {
    state.checkout = await createCheckout(paymentId);
  } catch {
    state.failed = true;
    await completePayment(paymentId, PaymentStatus.FAIL);
    return PaymentStatus.FAIL;
  }

  const expiresAt = Date.now() + PAYMENT_EXPIRATION_MS;

  while (Date.now() < expiresAt) {
    const waitMs = Math.min(STATUS_CHECK_INTERVAL_MS, expiresAt - Date.now());
    await condition(() => notified, waitMs);
    notified = false;

    const status = await checkPaymentStatus(paymentId);

    if (status !== PaymentStatus.PENDING) {
      await completePayment(paymentId, status);
      return status;
    }
  }

  await completePayment(paymentId, PaymentStatus.FAIL);
  return PaymentStatus.FAIL;
}
