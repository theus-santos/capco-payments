import { Payment } from '../../../src/domain/entities/payment.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../src/domain/enums/payment.enum';
import {
  InvalidCpfError,
  InvalidStatusTransitionError,
  PaymentNotFoundError,
} from '../../../src/domain/errors/payment.error';
import { PaymentRepository } from '../../../src/domain/interfaces/payment.interface';
import { PaymentService } from '../../../src/services/payment.service';

const makePayment = () =>
  Payment.create({
    cpf: '529.982.247-25',
    description: 'Monthly subscription',
    amount: 99.9,
    paymentMethod: PaymentMethod.PIX,
  });

describe('PaymentService', () => {
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let service: PaymentService;

  beforeEach(() => {
    paymentRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    service = new PaymentService(paymentRepository);
  });

  describe('create', () => {
    it('should create a PENDING payment and save it', async () => {
      const payment = await service.create({
        cpf: '529.982.247-25',
        description: 'Order #1',
        amount: 50,
        paymentMethod: PaymentMethod.PIX,
      });

      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(paymentRepository.save).toHaveBeenCalledWith(payment);
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

      expect(paymentRepository.save).not.toHaveBeenCalled();
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
      expect(paymentRepository.save).toHaveBeenCalledWith(payment);
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

      expect(paymentRepository.save).not.toHaveBeenCalled();
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
});
