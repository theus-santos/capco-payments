import { randomUUID } from 'crypto';
import { PAYMENT_STATUS_TRANSITIONS } from '../constants/payment.constant';
import { PaymentMethod, PaymentStatus } from '../enums/payment.enum';
import {
  InvalidAmountError,
  InvalidDescriptionError,
  InvalidStatusTransitionError,
  PaymentNotEditableError,
} from '../errors/payment.error';
import {
  CreatePaymentProps,
  PaymentProps,
  UpdatePaymentDetails,
} from '../interfaces/payment.interface';
import { Cpf } from '../value-objects/cpf';

export class Payment {
  private constructor(private props: PaymentProps) {}

  static create(data: CreatePaymentProps): Payment {
    const now = new Date();

    return new Payment({
      id: randomUUID(),
      cpf: Cpf.create(data.cpf).value,
      description: Payment.validateDescription(data.description),
      amount: Payment.validateAmount(data.amount),
      paymentMethod: data.paymentMethod,
      status: PaymentStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: PaymentProps): Payment {
    return new Payment({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get cpf(): string {
    return this.props.cpf;
  }

  get description(): string {
    return this.props.description;
  }

  get amount(): number {
    return this.props.amount;
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isFinal(): boolean {
    return PAYMENT_STATUS_TRANSITIONS[this.props.status].length === 0;
  }

  changeStatus(status: PaymentStatus): void {
    if (status === this.props.status) return;

    if (!PAYMENT_STATUS_TRANSITIONS[this.props.status].includes(status)) {
      throw new InvalidStatusTransitionError(this.props.status, status);
    }

    this.props.status = status;
    this.touch();
  }

  markAsPaid(): void {
    this.changeStatus(PaymentStatus.PAID);
  }

  markAsFailed(): void {
    this.changeStatus(PaymentStatus.FAIL);
  }

  updateDetails(data: UpdatePaymentDetails): void {
    if (data.description === undefined && data.amount === undefined) return;

    if (this.isFinal()) {
      throw new PaymentNotEditableError(this.props.status);
    }

    if (data.description !== undefined) {
      this.props.description = Payment.validateDescription(data.description);
    }

    if (data.amount !== undefined) {
      this.props.amount = Payment.validateAmount(data.amount);
    }

    this.touch();
  }

  toJSON(): PaymentProps {
    return { ...this.props };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  private static validateAmount(amount: number): number {
    const cents = amount * 100;
    const hasAtMostTwoDecimals = Math.abs(cents - Math.round(cents)) < 1e-6;

    if (!Number.isFinite(amount) || amount <= 0 || !hasAtMostTwoDecimals) {
      throw new InvalidAmountError(amount);
    }

    return amount;
  }

  private static validateDescription(description: string): string {
    const value = (description ?? '').trim();

    if (!value) {
      throw new InvalidDescriptionError();
    }

    return value;
  }
}
