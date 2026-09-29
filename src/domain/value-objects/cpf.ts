import { InvalidCpfError } from '../errors/payment.error';

export class Cpf {
  private constructor(public readonly value: string) {}

  static create(raw: string): Cpf {
    const digits = (raw ?? '').replace(/\D/g, '');

    if (!Cpf.isValid(digits)) {
      throw new InvalidCpfError(raw);
    }

    return new Cpf(digits);
  }

  static isValid(digits: string): boolean {
    if (!/^\d{11}$/.test(digits)) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    return (
      Cpf.checkDigit(digits, 9) === Number(digits[9]) &&
      Cpf.checkDigit(digits, 10) === Number(digits[10])
    );
  }

  private static checkDigit(digits: string, length: number): number {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  }
}
