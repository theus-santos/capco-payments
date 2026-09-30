import { Payment } from '../../../src/domain/entities/payment.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../src/domain/enums/payment.enum';
import { PaymentNotFoundError } from '../../../src/domain/errors/payment.error';
import {
  PaymentGateway,
  PaymentRepository,
} from '../../../src/domain/interfaces/payment.interface';
import { PaymentActivities } from '../../../src/interfaces/payment-workflow.interface';
import { createPaymentActivities } from '../../../src/workflows/payment.activities';

const checkout = {
  preferenceId: 'pref-123',
  checkoutUrl: 'https://www.mercadopago.com.br/checkout?pref_id=pref-123',
};

const makePayment = () =>
  Payment.create({
    cpf: '529.982.247-25',
    description: 'Order #1',
    amount: 50,
    paymentMethod: PaymentMethod.CREDIT_CARD,
  });

describe('PaymentActivities', () => {
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let paymentGateway: jest.Mocked<PaymentGateway>;
  let activities: PaymentActivities;

  beforeEach(() => {
    paymentRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    paymentGateway = {
      createCheckout: jest.fn(),
      findTransaction: jest.fn(),
      isPaymentApproved: jest.fn(),
    };
    activities = createPaymentActivities(paymentRepository, paymentGateway);
  });

  describe('createCheckout', () => {
    it('should create the checkout and save it on the payment', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);
      paymentGateway.createCheckout.mockResolvedValue(checkout);

      await expect(activities.createCheckout(payment.id)).resolves.toEqual(
        checkout,
      );

      expect(payment.checkoutUrl).toBe(checkout.checkoutUrl);
      expect(paymentRepository.update).toHaveBeenCalledWith(payment);
    });

    it('should not call Mercado Pago again when retried', async () => {
      const payment = makePayment();
      payment.attachCheckout(checkout);
      paymentRepository.findById.mockResolvedValue(payment);

      await expect(activities.createCheckout(payment.id)).resolves.toEqual(
        checkout,
      );

      expect(paymentGateway.createCheckout).not.toHaveBeenCalled();
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when the payment does not exist', async () => {
      paymentRepository.findById.mockResolvedValue(null);

      await expect(activities.createCheckout('unknown')).rejects.toThrow(
        PaymentNotFoundError,
      );
    });
  });

  describe('checkPaymentStatus', () => {
    it('should return PAID when Mercado Pago approved the payment', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);
      paymentGateway.isPaymentApproved.mockResolvedValue(true);

      await expect(activities.checkPaymentStatus(payment.id)).resolves.toBe(
        PaymentStatus.PAID,
      );
      expect(paymentGateway.isPaymentApproved).toHaveBeenCalledWith(payment.id);
    });

    it('should return PENDING while there is no approval', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);
      paymentGateway.isPaymentApproved.mockResolvedValue(false);

      await expect(activities.checkPaymentStatus(payment.id)).resolves.toBe(
        PaymentStatus.PENDING,
      );
    });

    it('should return the saved status when the payment is already finished', async () => {
      const payment = makePayment();
      payment.markAsFailed();
      paymentRepository.findById.mockResolvedValue(payment);

      await expect(activities.checkPaymentStatus(payment.id)).resolves.toBe(
        PaymentStatus.FAIL,
      );
      expect(paymentGateway.isPaymentApproved).not.toHaveBeenCalled();
    });
  });

  describe('completePayment', () => {
    it('should save the final status', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);

      await activities.completePayment(payment.id, PaymentStatus.PAID);

      expect(payment.status).toBe(PaymentStatus.PAID);
      expect(paymentRepository.update).toHaveBeenCalledWith(payment);
    });

    it('should do nothing when the payment is already finished', async () => {
      const payment = makePayment();
      payment.markAsPaid();
      paymentRepository.findById.mockResolvedValue(payment);

      await activities.completePayment(payment.id, PaymentStatus.FAIL);

      expect(payment.status).toBe(PaymentStatus.PAID);
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });
  });
});
