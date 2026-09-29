import { PaymentStatus } from '../domain/enums/payment.enum';

export const MERCADO_PAGO_STATUS: Record<string, PaymentStatus> = {
  approved: PaymentStatus.PAID,
  rejected: PaymentStatus.FAIL,
  cancelled: PaymentStatus.FAIL,
};
