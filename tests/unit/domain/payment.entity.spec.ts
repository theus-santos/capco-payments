import { Payment } from '../../../src/domain/entities/payment.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../src/domain/enums/payment.enum';
import {
  CheckoutNotAllowedError,
  InvalidAmountError,
  InvalidCpfError,
  InvalidDescriptionError,
  InvalidStatusTransitionError,
  PaymentAmountLockedError,
  PaymentNotEditableError,
} from '../../../src/domain/errors/payment.error';
import { CreatePaymentProps } from '../../../src/domain/interfaces/payment.interface';

const makePayment = (data: Partial<CreatePaymentProps> = {}) =>
  Payment.create({
    cpf: '529.982.247-25',
    description: 'Monthly subscription',
    amount: 99.9,
    paymentMethod: PaymentMethod.PIX,
    ...data,
  });

const checkout = {
  preferenceId: 'pref-123',
  checkoutUrl:
    'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123',
};

describe('Payment', () => {
  describe('create', () => {
    it('should create a PENDING payment', () => {
      const payment = makePayment();

      expect(payment.id).toBeDefined();
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.cpf).toBe('52998224725');
      expect(payment.amount).toBe(99.9);
      expect(payment.paymentMethod).toBe(PaymentMethod.PIX);
    });

    it('should trim the description', () => {
      const payment = makePayment({ description: '  Order #1  ' });

      expect(payment.description).toBe('Order #1');
    });

    it('should accept amounts like 0.1 and 19.99', () => {
      expect(makePayment({ amount: 0.1 }).amount).toBe(0.1);
      expect(makePayment({ amount: 19.99 }).amount).toBe(19.99);
    });

    it('should throw when CPF is invalid', () => {
      expect(() => makePayment({ cpf: '123' })).toThrow(InvalidCpfError);
    });

    it.each([0, -10, 10.123, NaN, Infinity])(
      'should throw when amount is %s',
      (amount) => {
        expect(() => makePayment({ amount })).toThrow(InvalidAmountError);
      },
    );

    it('should throw when description is empty', () => {
      expect(() => makePayment({ description: '   ' })).toThrow(
        InvalidDescriptionError,
      );
    });
  });

  describe('status', () => {
    it('should change from PENDING to PAID', () => {
      const payment = makePayment();

      payment.markAsPaid();

      expect(payment.status).toBe(PaymentStatus.PAID);
    });

    it('should change from PENDING to FAIL', () => {
      const payment = makePayment();

      payment.markAsFailed();

      expect(payment.status).toBe(PaymentStatus.FAIL);
    });

    it('should do nothing when the status is the same', () => {
      const payment = makePayment();
      payment.markAsPaid();

      expect(() => payment.markAsPaid()).not.toThrow();
      expect(payment.status).toBe(PaymentStatus.PAID);
    });

    it.each([
      [PaymentStatus.PAID, PaymentStatus.PENDING],
      [PaymentStatus.PAID, PaymentStatus.FAIL],
      [PaymentStatus.FAIL, PaymentStatus.PAID],
      [PaymentStatus.FAIL, PaymentStatus.PENDING],
    ])('should not allow %s -> %s', (from, to) => {
      const payment = makePayment();
      payment.changeStatus(from);

      expect(() => payment.changeStatus(to)).toThrow(
        InvalidStatusTransitionError,
      );
    });
  });

  describe('updateDetails', () => {
    it('should update description and amount while PENDING', () => {
      const payment = makePayment();

      payment.updateDetails({ description: 'New description', amount: 10 });

      expect(payment.description).toBe('New description');
      expect(payment.amount).toBe(10);
    });

    it('should not allow editing a finished payment', () => {
      const payment = makePayment();
      payment.markAsPaid();

      expect(() => payment.updateDetails({ amount: 1 })).toThrow(
        PaymentNotEditableError,
      );
    });

    it('should not change anything when one of the fields is invalid', () => {
      const payment = makePayment();

      expect(() =>
        payment.updateDetails({ description: 'New description', amount: -1 }),
      ).toThrow(InvalidAmountError);
      expect(payment.description).toBe('Monthly subscription');
    });

    it('should not allow changing the amount after checkout is created', () => {
      const payment = makePayment({ paymentMethod: PaymentMethod.CREDIT_CARD });
      payment.attachCheckout(checkout);

      expect(() => payment.updateDetails({ amount: 1 })).toThrow(
        PaymentAmountLockedError,
      );
    });

    it('should allow changing the description after checkout is created', () => {
      const payment = makePayment({ paymentMethod: PaymentMethod.CREDIT_CARD });
      payment.attachCheckout(checkout);

      payment.updateDetails({ description: 'New description' });

      expect(payment.description).toBe('New description');
    });
  });

  describe('attachCheckout', () => {
    it('should attach Mercado Pago checkout to a CREDIT_CARD payment', () => {
      const payment = makePayment({ paymentMethod: PaymentMethod.CREDIT_CARD });

      payment.attachCheckout(checkout);

      expect(payment.preferenceId).toBe('pref-123');
      expect(payment.checkoutUrl).toBe(checkout.checkoutUrl);
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    it('should not attach checkout to a PIX payment', () => {
      const payment = makePayment({ paymentMethod: PaymentMethod.PIX });

      expect(() => payment.attachCheckout(checkout)).toThrow(
        CheckoutNotAllowedError,
      );
    });

    it('should not attach checkout to a finished payment', () => {
      const payment = makePayment({ paymentMethod: PaymentMethod.CREDIT_CARD });
      payment.markAsFailed();

      expect(() => payment.attachCheckout(checkout)).toThrow(
        CheckoutNotAllowedError,
      );
    });
  });

  describe('restore', () => {
    it('should rebuild a payment keeping its data', () => {
      const original = makePayment();
      original.markAsPaid();

      const restored = Payment.restore(original.toJSON());

      expect(restored.toJSON()).toEqual(original.toJSON());
    });
  });
});
