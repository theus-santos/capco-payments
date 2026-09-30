import { ConfigService } from '@nestjs/config';
import { Client, WorkflowNotFoundError } from '@temporalio/client';
import { PaymentGatewayError } from '../../../src/domain/errors/payment.error';
import { TemporalPaymentWorkflow } from '../../../src/workflows/payment-workflow.client';
import {
  checkoutStateQuery,
  paymentNotificationSignal,
} from '../../../src/constants/payment-workflow.constant';
import { creditCardPaymentWorkflow } from '../../../src/workflows/payment.workflow';

const checkout = {
  preferenceId: 'pref-123',
  checkoutUrl: 'https://www.mercadopago.com.br/checkout?pref_id=pref-123',
};

describe('TemporalPaymentWorkflow', () => {
  let query: jest.Mock;
  let signal: jest.Mock;
  let start: jest.Mock;
  let getHandle: jest.Mock;
  let workflow: TemporalPaymentWorkflow;

  beforeEach(() => {
    query = jest.fn();
    signal = jest.fn();
    start = jest.fn().mockResolvedValue({ query });
    getHandle = jest.fn().mockReturnValue({ signal });

    const client = { workflow: { start, getHandle } } as unknown as Client;
    const config = {
      getOrThrow: () => 'payments',
    } as unknown as ConfigService;

    workflow = new TemporalPaymentWorkflow(client, config);
  });

  describe('start', () => {
    it('should start the workflow and wait for the checkout', async () => {
      query
        .mockResolvedValueOnce({ checkout: null, failed: false })
        .mockResolvedValueOnce({ checkout, failed: false });

      await expect(workflow.start('abc')).resolves.toEqual(checkout);

      expect(start).toHaveBeenCalledWith(creditCardPaymentWorkflow, {
        workflowId: 'payment-abc',
        taskQueue: 'payments',
        args: ['abc'],
      });
      expect(query).toHaveBeenCalledWith(checkoutStateQuery);
    });

    it('should throw when the workflow could not create the checkout', async () => {
      query.mockResolvedValue({ checkout: null, failed: true });

      await expect(workflow.start('abc')).rejects.toThrow(PaymentGatewayError);
    });
  });

  describe('notify', () => {
    it('should signal the running workflow', async () => {
      signal.mockResolvedValue(undefined);

      await expect(workflow.notify('abc')).resolves.toBe(true);

      expect(getHandle).toHaveBeenCalledWith('payment-abc');
      expect(signal).toHaveBeenCalledWith(paymentNotificationSignal);
    });

    it('should return false when there is no workflow running', async () => {
      signal.mockRejectedValue(
        new WorkflowNotFoundError('not found', 'payment-abc', undefined),
      );

      await expect(workflow.notify('abc')).resolves.toBe(false);
    });

    it('should rethrow unexpected errors', async () => {
      signal.mockRejectedValue(new Error('connection refused'));

      await expect(workflow.notify('abc')).rejects.toThrow(
        'connection refused',
      );
    });
  });
});
