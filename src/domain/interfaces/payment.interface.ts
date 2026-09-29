import { PaymentMethod, PaymentStatus } from '../enums/payment.enum';

export interface PaymentProps {
  id: string;
  cpf: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
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
