import { Payment } from '../entities/payment.entity';
import { PaymentMethod, PaymentStatus } from '../enums/payment.enum';

export interface PaymentProps {
  id: string;
  cpf: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  preferenceId: string | null;
  checkoutUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentProps {
  cpf: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface UpdatePaymentDetails {
  description?: string;
  amount?: number;
}

export interface UpdatePaymentProps extends UpdatePaymentDetails {
  status?: PaymentStatus;
}

export interface PaymentFilters {
  cpf?: string;
  paymentMethod?: PaymentMethod;
}

export abstract class PaymentRepository {
  abstract create(payment: Payment): Promise<void>;
  abstract update(payment: Payment): Promise<void>;
  abstract findById(id: string): Promise<Payment | null>;
  abstract findAll(filters: PaymentFilters): Promise<Payment[]>;
}

export interface PaymentCheckout {
  preferenceId: string;
  checkoutUrl: string;
}

export interface GatewayTransaction {
  paymentId: string | null;
  status: PaymentStatus;
}

export abstract class PaymentGateway {
  abstract createCheckout(payment: Payment): Promise<PaymentCheckout>;
  abstract findTransaction(transactionId: string): Promise<GatewayTransaction>;
}
