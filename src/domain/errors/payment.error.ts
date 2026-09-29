import { DomainError } from './domain.error';

export class InvalidCpfError extends DomainError {
  constructor(value: string) {
    super(`Invalid CPF: ${value}`);
  }
}

export class InvalidAmountError extends DomainError {
  constructor(value: number) {
    super(
      `Invalid amount: ${value}. It must be greater than zero with at most 2 decimal places`,
    );
  }
}

export class InvalidDescriptionError extends DomainError {
  constructor() {
    super('Description must not be empty');
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Cannot change payment status from ${from} to ${to}`);
  }
}

export class PaymentNotEditableError extends DomainError {
  constructor(status: string) {
    super(`Payment with status ${status} can no longer be edited`);
  }
}

export class PaymentNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Payment ${id} not found`);
  }
}
