import { ConfigService } from '@nestjs/config';
import { Payment as MercadoPagoPayment, Preference } from 'mercadopago';
import { Payment } from '../../../src/domain/entities/payment.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../src/domain/enums/payment.enum';
import { PaymentGatewayError } from '../../../src/domain/errors/payment.error';
import { MercadoPagoGateway } from '../../../src/integrations/mercado-pago.gateway';

jest.mock('mercadopago');

const makeConfig = (values: Record<string, string>) =>
  ({
    getOrThrow: (key: string) => values[key],
  }) as unknown as ConfigService;

const makePayment = () =>
  Payment.create({
    cpf: '529.982.247-25',
    description: 'Monthly subscription',
    amount: 99.9,
    paymentMethod: PaymentMethod.CREDIT_CARD,
  });

describe('MercadoPagoGateway', () => {
  let createPreference: jest.Mock;
  let getPayment: jest.Mock;

  beforeEach(() => {
    createPreference = jest.fn();
    getPayment = jest.fn();
    jest
      .mocked(MercadoPagoPayment)
      .mockImplementation(
        () => ({ get: getPayment }) as unknown as MercadoPagoPayment,
      );
    jest
      .mocked(Preference)
      .mockImplementation(
        () => ({ create: createPreference }) as unknown as Preference,
      );
  });

  const makeGateway = (publicUrl = 'https://api.example.com') =>
    new MercadoPagoGateway(
      makeConfig({
        MERCADOPAGO_ACCESS_TOKEN: 'TEST-token',
        APP_PUBLIC_URL: publicUrl,
      }),
    );

  it('should create a preference and return the checkout', async () => {
    createPreference.mockResolvedValue({
      id: 'pref-123',
      init_point: 'https://mercadopago.com.br/checkout?pref_id=pref-123',
    });
    const payment = makePayment();

    const checkout = await makeGateway().createCheckout(payment);

    expect(checkout).toEqual({
      preferenceId: 'pref-123',
      checkoutUrl: 'https://mercadopago.com.br/checkout?pref_id=pref-123',
    });
    expect(createPreference).toHaveBeenCalledWith({
      body: expect.objectContaining({
        external_reference: payment.id,
        notification_url: 'https://api.example.com/api/payment/webhook',
        items: [
          {
            id: payment.id,
            title: 'Monthly subscription',
            quantity: 1,
            unit_price: 99.9,
            currency_id: 'BRL',
          },
        ],
        payer: { identification: { type: 'CPF', number: '52998224725' } },
      }),
      requestOptions: { idempotencyKey: payment.id },
    });
  });

  it('should not send notification_url when the API is not public', async () => {
    createPreference.mockResolvedValue({
      id: 'pref-123',
      init_point: 'https://mercadopago.com.br/checkout?pref_id=pref-123',
    });

    await makeGateway('http://localhost:3000').createCheckout(makePayment());

    expect(createPreference.mock.calls[0][0].body.notification_url).toBe(
      undefined,
    );
  });

  it('should throw PaymentGatewayError when Mercado Pago fails', async () => {
    createPreference.mockRejectedValue({ message: 'invalid access token' });

    await expect(makeGateway().createCheckout(makePayment())).rejects.toThrow(
      new PaymentGatewayError('invalid access token'),
    );
  });

  it('should throw PaymentGatewayError when there is no checkout url', async () => {
    createPreference.mockResolvedValue({ id: 'pref-123' });

    await expect(makeGateway().createCheckout(makePayment())).rejects.toThrow(
      PaymentGatewayError,
    );
  });

  describe('findTransaction', () => {
    it.each([
      ['approved', PaymentStatus.PAID],
      ['rejected', PaymentStatus.FAIL],
      ['cancelled', PaymentStatus.FAIL],
      ['pending', PaymentStatus.PENDING],
      ['in_process', PaymentStatus.PENDING],
    ])('should map Mercado Pago status %s to %s', async (mpStatus, status) => {
      getPayment.mockResolvedValue({
        id: 123,
        status: mpStatus,
        external_reference: 'payment-id',
      });

      const transaction = await makeGateway().findTransaction('123');

      expect(getPayment).toHaveBeenCalledWith({ id: '123' });
      expect(transaction).toEqual({ paymentId: 'payment-id', status });
    });

    it('should return null paymentId when there is no external reference', async () => {
      getPayment.mockResolvedValue({ id: 123, status: 'approved' });

      const transaction = await makeGateway().findTransaction('123');

      expect(transaction.paymentId).toBeNull();
    });

    it('should throw PaymentGatewayError when Mercado Pago fails', async () => {
      getPayment.mockRejectedValue({ message: 'not found' });

      await expect(makeGateway().findTransaction('123')).rejects.toThrow(
        new PaymentGatewayError('not found'),
      );
    });
  });
});
