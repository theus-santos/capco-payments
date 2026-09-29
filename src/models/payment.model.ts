import {
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { PaymentMethod, PaymentStatus } from '../domain/enums/payment.enum';

@Table({ tableName: 'payments', underscored: true })
export class PaymentModel extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING(11), allowNull: false })
  declare cpf: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare description: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare amount: string;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentMethod)),
    allowNull: false,
  })
  declare paymentMethod: PaymentMethod;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
  })
  declare status: PaymentStatus;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
