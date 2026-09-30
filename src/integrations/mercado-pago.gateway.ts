import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoConfig,
  Payment as MercadoPagoPayment,
  Preference,
} from 'mercadopago';
import { Payment } from '../domain/entities/payment.entity';
import { PaymentStatus } from '../domain/enums/payment.enum';
import { PaymentGatewayError } from '../domain/errors/payment.error';
import {
  GatewayTransaction,
  PaymentCheckout,
  PaymentGateway,
} from '../domain/interfaces/payment.interface';
import { MERCADO_PAGO_STATUS } from '../constants/mercado-pago.constant';

@Injectable()
export class MercadoPagoGateway extends PaymentGateway {
  private readonly preference: Preference;
  private readonly mercadoPagoPayment: MercadoPagoPayment;
  private readonly notificationUrl?: string;

  constructor(config: ConfigService) {
    super();

    const client = new MercadoPagoConfig({
      accessToken: config.getOrThrow<string>('MERCADOPAGO_ACCESS_TOKEN'),
    });
    this.preference = new Preference(client);
    this.mercadoPagoPayment = new MercadoPagoPayment(client);

    const publicUrl = config.getOrThrow<string>('APP_PUBLIC_URL');
    if (publicUrl.startsWith('https://')) {
      this.notificationUrl = `${publicUrl}/api/payment/webhook`;
    }
  }

  async createCheckout(payment: Payment): Promise<PaymentCheckout> {
    try {
      const response = await this.preference.create({
        body: {
          external_reference: payment.id,
          notification_url: this.notificationUrl,
          items: [
            {
              id: payment.id,
              title: payment.description,
              quantity: 1,
              unit_price: payment.amount,
              currency_id: 'BRL',
            },
          ],
          payer: {
            identification: { type: 'CPF', number: payment.cpf },
          },
          payment_methods: {
            excluded_payment_types: [
              { id: 'ticket' },
              { id: 'bank_transfer' },
              { id: 'atm' },
              { id: 'debit_card' },
              { id: 'prepaid_card' },
            ],
            installments: 12,
          },
        },
        requestOptions: { idempotencyKey: payment.id },
      });

      const checkoutUrl = response.init_point ?? response.sandbox_init_point;

      if (!response.id || !checkoutUrl) {
        throw new PaymentGatewayError(
          'preference created without checkout url',
        );
      }

      return { preferenceId: response.id, checkoutUrl };
    } catch (error) {
      if (error instanceof PaymentGatewayError) throw error;

      throw new PaymentGatewayError(this.getErrorMessage(error));
    }
  }

  async findTransaction(transactionId: string): Promise<GatewayTransaction> {
    try {
      const response = await this.mercadoPagoPayment.get({ id: transactionId });

      return {
        paymentId: response.external_reference ?? null,
        status:
          MERCADO_PAGO_STATUS[response.status ?? ''] ?? PaymentStatus.PENDING,
      };
    } catch (error) {
      throw new PaymentGatewayError(this.getErrorMessage(error));
    }
  }

  async isPaymentApproved(paymentId: string): Promise<boolean> {
    try {
      const response = await this.mercadoPagoPayment.search({
        options: { external_reference: paymentId },
      });

      return (response.results ?? []).some(
        (result) =>
          MERCADO_PAGO_STATUS[result.status ?? ''] === PaymentStatus.PAID,
      );
    } catch (error) {
      throw new PaymentGatewayError(this.getErrorMessage(error));
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String(error.message);
    }

    return 'unexpected error';
  }
}
