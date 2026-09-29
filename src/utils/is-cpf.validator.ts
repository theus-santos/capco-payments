import { registerDecorator, ValidationOptions } from 'class-validator';
import { Cpf } from '../domain/value-objects/cpf';

export function IsCpf(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} must be a valid CPF`, ...options },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Cpf.isValid(value.replace(/\D/g, '')),
      },
    });
  };
}
