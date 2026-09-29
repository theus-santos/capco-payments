import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WhereOptions } from 'sequelize';
import { Payment } from '../domain/entities/payment.entity';
import {
  PaymentFilters,
  PaymentRepository,
} from '../domain/interfaces/payment.interface';
import { PaymentModel } from '../models/payment.model';

@Injectable()
export class SequelizePaymentRepository extends PaymentRepository {
  constructor(
    @InjectModel(PaymentModel)
    private readonly paymentModel: typeof PaymentModel,
  ) {
    super();
  }

  async create(payment: Payment): Promise<void> {
    const data = payment.toJSON();

    await this.paymentModel.create({
      ...data,
      amount: data.amount.toFixed(2),
    });
  }

  async update(payment: Payment): Promise<void> {
    const data = payment.toJSON();

    await this.paymentModel.update(
      {
        description: data.description,
        amount: data.amount.toFixed(2),
        status: data.status,
        preferenceId: data.preferenceId,
        checkoutUrl: data.checkoutUrl,
        updatedAt: data.updatedAt,
      },
      { where: { id: data.id } },
    );
  }

  async findById(id: string): Promise<Payment | null> {
    const model = await this.paymentModel.findByPk(id);

    return model ? this.toEntity(model) : null;
  }

  async findAll(filters: PaymentFilters): Promise<Payment[]> {
    const where: WhereOptions<PaymentModel> = {};

    if (filters.cpf) where.cpf = filters.cpf;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    const models = await this.paymentModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return models.map((model) => this.toEntity(model));
  }

  private toEntity(model: PaymentModel): Payment {
    return Payment.restore({
      id: model.id,
      cpf: model.cpf,
      description: model.description,
      amount: Number(model.amount),
      paymentMethod: model.paymentMethod,
      status: model.status,
      preferenceId: model.preferenceId,
      checkoutUrl: model.checkoutUrl,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }
}
