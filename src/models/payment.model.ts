import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PaymentMethod, PaymentStatus } from '../domain/enums/payment.enum';

@Table({ tableName: 'payments', underscored: true, timestamps: false })
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

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare preferenceId: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare checkoutUrl: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updatedAt: Date;
}
