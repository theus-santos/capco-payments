import { PaymentStatus } from '../enums/payment.enum';

export const PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatus,
  PaymentStatus[]
> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAIL],
  [PaymentStatus.PAID]: [],
  [PaymentStatus.FAIL]: [],
};
