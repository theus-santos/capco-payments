import { InvalidCpfError } from '../../../src/domain/errors/payment.error';
import { Cpf } from '../../../src/domain/value-objects/cpf';

describe('Cpf', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])(
    'should accept valid CPF %s',
    (value) => {
      const cpf = Cpf.create(value);

      expect(cpf.value).toMatch(/^\d{11}$/);
    },
  );

  it('should keep only digits', () => {
    expect(Cpf.create('529.982.247-25').value).toBe('52998224725');
  });

  it.each([
    ['wrong check digit', '529.982.247-24'],
    ['repeated digits', '111.111.111-11'],
    ['too short', '1234567890'],
    ['letters', 'abc'],
    ['empty', ''],
  ])('should reject CPF with %s', (_, value) => {
    expect(() => Cpf.create(value)).toThrow(InvalidCpfError);
  });
});
