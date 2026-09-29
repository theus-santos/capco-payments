import { Payment } from '../../../src/domain/entities/payment.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../src/domain/enums/payment.enum';
import {
  InvalidCpfError,
  InvalidStatusTransitionError,
  PaymentGatewayError,
  PaymentNotFoundError,
} from '../../../src/domain/errors/payment.error';
import {
  PaymentGateway,
  PaymentRepository,
} from '../../../src/domain/interfaces/payment.interface';
import { PaymentService } from '../../../src/services/payment.service';

const makePayment = () =>
  Payment.create({
    cpf: '529.982.247-25',
    description: 'Monthly subscription',
    amount: 99.9,
    paymentMethod: PaymentMethod.PIX,
  });

const checkout = {
  preferenceId: 'pref-123',
  checkoutUrl:
    'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123',
};

describe('PaymentService', () => {
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let paymentGateway: jest.Mocked<PaymentGateway>;
  let service: PaymentService;

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
    };
    service = new PaymentService(paymentRepository, paymentGateway);
  });

  describe('create', () => {
    it('should create a PIX payment as PENDING without calling the gateway', async () => {
      const payment = await service.create({
        cpf: '529.982.247-25',
        description: 'Order #1',
        amount: 50,
        paymentMethod: PaymentMethod.PIX,
      });

      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.checkoutUrl).toBeNull();
      expect(paymentRepository.create).toHaveBeenCalledWith(payment);
      expect(paymentGateway.createCheckout).not.toHaveBeenCalled();
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should create a CREDIT_CARD payment with Mercado Pago checkout', async () => {
      paymentGateway.createCheckout.mockResolvedValue(checkout);

      const payment = await service.create({
        cpf: '529.982.247-25',
        description: 'Order #1',
        amount: 50,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      expect(paymentRepository.create).toHaveBeenCalledWith(payment);
      expect(paymentGateway.createCheckout).toHaveBeenCalledWith(payment);
      expect(paymentRepository.update).toHaveBeenCalledWith(payment);
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.preferenceId).toBe('pref-123');
      expect(payment.checkoutUrl).toBe(checkout.checkoutUrl);
    });

    it('should mark CREDIT_CARD payment as FAIL when Mercado Pago fails', async () => {
      paymentGateway.createCheckout.mockRejectedValue(
        new PaymentGatewayError('unauthorized'),
      );

      await expect(
        service.create({
          cpf: '529.982.247-25',
          description: 'Order #1',
          amount: 50,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        }),
      ).rejects.toThrow(PaymentGatewayError);

      const failed = paymentRepository.update.mock.calls[0][0];
      expect(failed.status).toBe(PaymentStatus.FAIL);
      expect(failed.checkoutUrl).toBeNull();
    });

    it('should not save when data is invalid', async () => {
      await expect(
        service.create({
          cpf: '123',
          description: 'Order #1',
          amount: 50,
          paymentMethod: PaymentMethod.PIX,
        }),
      ).rejects.toThrow(InvalidCpfError);

      expect(paymentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return the payment', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);

      await expect(service.findById(payment.id)).resolves.toBe(payment);
    });

    it('should throw when payment does not exist', async () => {
      paymentRepository.findById.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(
        PaymentNotFoundError,
      );
    });
  });

  describe('update', () => {
    it('should update details and status', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);

      const updated = await service.update(payment.id, {
        description: 'New description',
        amount: 10,
        status: PaymentStatus.PAID,
      });

      expect(updated.description).toBe('New description');
      expect(updated.amount).toBe(10);
      expect(updated.status).toBe(PaymentStatus.PAID);
      expect(paymentRepository.update).toHaveBeenCalledWith(payment);
    });

    it('should update only the status', async () => {
      const payment = makePayment();
      paymentRepository.findById.mockResolvedValue(payment);

      const updated = await service.update(payment.id, {
        status: PaymentStatus.FAIL,
      });

      expect(updated.status).toBe(PaymentStatus.FAIL);
      expect(updated.description).toBe('Monthly subscription');
    });

    it('should not save an invalid status transition', async () => {
      const payment = makePayment();
      payment.markAsPaid();
      paymentRepository.findById.mockResolvedValue(payment);

      await expect(
        service.update(payment.id, { status: PaymentStatus.PENDING }),
      ).rejects.toThrow(InvalidStatusTransitionError);

      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when payment does not exist', async () => {
      paymentRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('unknown', { status: PaymentStatus.PAID }),
      ).rejects.toThrow(PaymentNotFoundError);
    });
  });

  describe('findAll', () => {
    it('should normalize the CPF before filtering', async () => {
      paymentRepository.findAll.mockResolvedValue([]);

      await service.findAll({
        cpf: '529.982.247-25',
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      expect(paymentRepository.findAll).toHaveBeenCalledWith({
        cpf: '52998224725',
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });
    });

    it('should list without filters', async () => {
      const payments = [makePayment()];
      paymentRepository.findAll.mockResolvedValue(payments);

      await expect(service.findAll({})).resolves.toBe(payments);
      expect(paymentRepository.findAll).toHaveBeenCalledWith({
        cpf: undefined,
        paymentMethod: undefined,
      });
    });

    it('should throw when the CPF filter is invalid', async () => {
      await expect(service.findAll({ cpf: '123' })).rejects.toThrow(
        InvalidCpfError,
      );
    });
  });
  describe('handleGatewayNotification', () => {
    const makeCardPayment = () => {
      const payment = Payment.create({
        cpf: '529.982.247-25',
        description: 'Order #1',
        amount: 50,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });
      payment.attachCheckout(checkout);
      return payment;
    };

    it('should mark the payment as PAID when Mercado Pago approves it', async () => {
      const payment = makeCardPayment();
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: payment.id,
        status: PaymentStatus.PAID,
      });
      paymentRepository.findById.mockResolvedValue(payment);

      await service.handleGatewayNotification('mp-123');

      expect(paymentGateway.findTransaction).toHaveBeenCalledWith('mp-123');
      expect(paymentRepository.findById).toHaveBeenCalledWith(payment.id);
      expect(payment.status).toBe(PaymentStatus.PAID);
      expect(paymentRepository.update).toHaveBeenCalledWith(payment);
    });

    it('should mark the payment as FAIL when Mercado Pago rejects it', async () => {
      const payment = makeCardPayment();
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: payment.id,
        status: PaymentStatus.FAIL,
      });
      paymentRepository.findById.mockResolvedValue(payment);

      await service.handleGatewayNotification('mp-123');

      expect(payment.status).toBe(PaymentStatus.FAIL);
      expect(paymentRepository.update).toHaveBeenCalledWith(payment);
    });

    it('should do nothing while Mercado Pago payment is still pending', async () => {
      const payment = makeCardPayment();
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: payment.id,
        status: PaymentStatus.PENDING,
      });
      paymentRepository.findById.mockResolvedValue(payment);

      await service.handleGatewayNotification('mp-123');

      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should ignore repeated notifications', async () => {
      const payment = makeCardPayment();
      payment.markAsPaid();
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: payment.id,
        status: PaymentStatus.PAID,
      });
      paymentRepository.findById.mockResolvedValue(payment);

      await service.handleGatewayNotification('mp-123');

      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should not change a finished payment', async () => {
      const payment = makeCardPayment();
      payment.markAsPaid();
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: payment.id,
        status: PaymentStatus.FAIL,
      });
      paymentRepository.findById.mockResolvedValue(payment);

      await service.handleGatewayNotification('mp-123');

      expect(payment.status).toBe(PaymentStatus.PAID);
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should ignore transactions without payment reference', async () => {
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: null,
        status: PaymentStatus.PAID,
      });

      await service.handleGatewayNotification('mp-123');

      expect(paymentRepository.findById).not.toHaveBeenCalled();
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should ignore transactions of unknown payments', async () => {
      paymentGateway.findTransaction.mockResolvedValue({
        paymentId: 'unknown',
        status: PaymentStatus.PAID,
      });
      paymentRepository.findById.mockResolvedValue(null);

      await service.handleGatewayNotification('mp-123');

      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('should propagate gateway errors so Mercado Pago retries', async () => {
      paymentGateway.findTransaction.mockRejectedValue(
        new PaymentGatewayError('timeout'),
      );

      await expect(service.handleGatewayNotification('mp-123')).rejects.toThrow(
        PaymentGatewayError,
      );
    });
  });
});
