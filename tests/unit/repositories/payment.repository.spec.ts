import { Payment } from '../../../src/domain/entities/payment.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../src/domain/enums/payment.enum';
import { PaymentModel } from '../../../src/models/payment.model';
import { SequelizePaymentRepository } from '../../../src/repositories/payment.repository';

const makeRow = (data: Partial<PaymentModel> = {}) =>
  ({
    id: 'a1b2c3',
    cpf: '52998224725',
    description: 'Monthly subscription',
    amount: '99.90',
    paymentMethod: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    preferenceId: null,
    checkoutUrl: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...data,
  }) as PaymentModel;

describe('SequelizePaymentRepository', () => {
  let paymentModel: {
    create: jest.Mock;
    update: jest.Mock;
    findByPk: jest.Mock;
    findAll: jest.Mock;
  };
  let repository: SequelizePaymentRepository;

  const makePayment = () =>
    Payment.create({
      cpf: '529.982.247-25',
      description: 'Order #1',
      amount: 10.5,
      paymentMethod: PaymentMethod.CREDIT_CARD,
    });

  beforeEach(() => {
    paymentModel = {
      create: jest.fn(),
      update: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
    };
    repository = new SequelizePaymentRepository(
      paymentModel as unknown as typeof PaymentModel,
    );
  });

  describe('create', () => {
    it('should insert the payment with amount as decimal string', async () => {
      const payment = makePayment();

      await repository.create(payment);

      expect(paymentModel.create).toHaveBeenCalledWith({
        ...payment.toJSON(),
        amount: '10.50',
      });
    });
  });

  describe('update', () => {
    it('should update only the editable fields', async () => {
      const payment = makePayment();
      payment.markAsPaid();

      await repository.update(payment);

      expect(paymentModel.update).toHaveBeenCalledWith(
        {
          description: 'Order #1',
          amount: '10.50',
          status: PaymentStatus.PAID,
          preferenceId: null,
          checkoutUrl: null,
          updatedAt: payment.updatedAt,
        },
        { where: { id: payment.id } },
      );
    });
  });

  describe('findById', () => {
    it('should return a Payment entity when found', async () => {
      paymentModel.findByPk.mockResolvedValue(makeRow());

      const payment = await repository.findById('a1b2c3');

      expect(paymentModel.findByPk).toHaveBeenCalledWith('a1b2c3');
      expect(payment).toBeInstanceOf(Payment);
      expect(payment?.amount).toBe(99.9);
      expect(payment?.status).toBe(PaymentStatus.PENDING);
    });

    it('should return null when not found', async () => {
      paymentModel.findByPk.mockResolvedValue(null);

      await expect(repository.findById('unknown')).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('should filter by cpf and payment method', async () => {
      paymentModel.findAll.mockResolvedValue([makeRow()]);

      const payments = await repository.findAll({
        cpf: '52998224725',
        paymentMethod: PaymentMethod.PIX,
      });

      expect(paymentModel.findAll).toHaveBeenCalledWith({
        where: { cpf: '52998224725', paymentMethod: PaymentMethod.PIX },
        order: [['createdAt', 'DESC']],
      });
      expect(payments).toHaveLength(1);
      expect(payments[0]).toBeInstanceOf(Payment);
    });

    it('should not filter when no filters are given', async () => {
      paymentModel.findAll.mockResolvedValue([]);

      const payments = await repository.findAll({});

      expect(paymentModel.findAll).toHaveBeenCalledWith({
        where: {},
        order: [['createdAt', 'DESC']],
      });
      expect(payments).toEqual([]);
    });
  });
});
