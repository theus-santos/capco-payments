import { TestWorkflowEnvironment } from '@temporalio/testing';
import { DefaultLogger, Runtime, Worker } from '@temporalio/worker';
import { PaymentStatus } from '../../../src/domain/enums/payment.enum';
import {
  checkoutStateQuery,
  paymentNotificationSignal,
} from '../../../src/constants/payment-workflow.constant';
import { PaymentActivities } from '../../../src/interfaces/payment-workflow.interface';
import { creditCardPaymentWorkflow } from '../../../src/workflows/payment.workflow';

jest.setTimeout(120_000);

const checkout = {
  preferenceId: 'pref-123',
  checkoutUrl: 'https://www.mercadopago.com.br/checkout?pref_id=pref-123',
};

describe('creditCardPaymentWorkflow', () => {
  let env: TestWorkflowEnvironment;

  beforeAll(async () => {
    Runtime.install({ logger: new DefaultLogger('WARN') });
    env = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await env?.teardown();
  });

  const makeActivities = (): jest.Mocked<PaymentActivities> => ({
    createCheckout: jest.fn().mockResolvedValue(checkout),
    checkPaymentStatus: jest.fn().mockResolvedValue(PaymentStatus.PENDING),
    completePayment: jest.fn().mockResolvedValue(undefined),
  });

  const run = async (
    activities: PaymentActivities,
    test: (workflowId: string) => Promise<PaymentStatus>,
  ) => {
    const taskQueue = `test-${Math.random()}`;
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue,
      workflowsPath: require.resolve('../../../src/workflows/payment.workflow'),
      activities,
    });

    return worker.runUntil(async () => {
      const workflowId = `payment-${Math.random()}`;
      await env.client.workflow.start(creditCardPaymentWorkflow, {
        workflowId,
        taskQueue,
        args: ['payment-id'],
      });
      return test(workflowId);
    });
  };

  it('should expose the checkout and finish as PAID after the webhook signal', async () => {
    const activities = makeActivities();
    activities.checkPaymentStatus.mockResolvedValue(PaymentStatus.PAID);

    const result = await run(activities, async (workflowId) => {
      const handle = env.client.workflow.getHandle(workflowId);

      let state = await handle.query(checkoutStateQuery);
      while (!state.checkout) {
        state = await handle.query(checkoutStateQuery);
      }
      expect(state.checkout).toEqual(checkout);

      await handle.signal(paymentNotificationSignal);
      return (await handle.result()) as PaymentStatus;
    });

    expect(result).toBe(PaymentStatus.PAID);
    expect(activities.createCheckout).toHaveBeenCalledWith('payment-id');
    expect(activities.completePayment).toHaveBeenCalledWith(
      'payment-id',
      PaymentStatus.PAID,
    );
  });

  it('should find the approval by polling when the webhook never arrives', async () => {
    const activities = makeActivities();
    activities.checkPaymentStatus
      .mockResolvedValueOnce(PaymentStatus.PENDING)
      .mockResolvedValueOnce(PaymentStatus.PAID);

    const result = await run(activities, (workflowId) =>
      env.client.workflow.getHandle(workflowId).result(),
    );

    expect(result).toBe(PaymentStatus.PAID);
    expect(activities.checkPaymentStatus).toHaveBeenCalledTimes(2);
  });

  it('should finish as FAIL when the payment is not approved before expiration', async () => {
    const activities = makeActivities();

    const result = await run(activities, (workflowId) =>
      env.client.workflow.getHandle(workflowId).result(),
    );

    expect(result).toBe(PaymentStatus.FAIL);
    expect(activities.checkPaymentStatus).toHaveBeenCalledTimes(30);
    expect(activities.completePayment).toHaveBeenCalledWith(
      'payment-id',
      PaymentStatus.FAIL,
    );
  });

  it('should finish as FAIL when the checkout cannot be created', async () => {
    const activities = makeActivities();
    activities.createCheckout.mockRejectedValue(new Error('unauthorized'));

    const result = await run(activities, async (workflowId) => {
      const handle = env.client.workflow.getHandle(workflowId);
      const status = (await handle.result()) as PaymentStatus;
      const state = await handle.query(checkoutStateQuery);
      expect(state.failed).toBe(true);
      return status;
    });

    expect(result).toBe(PaymentStatus.FAIL);
    expect(activities.createCheckout).toHaveBeenCalledTimes(3);
    expect(activities.checkPaymentStatus).not.toHaveBeenCalled();
  });

  it('should finish with the status set manually in the database', async () => {
    const activities = makeActivities();
    activities.checkPaymentStatus.mockResolvedValue(PaymentStatus.FAIL);

    const result = await run(activities, (workflowId) =>
      env.client.workflow.getHandle(workflowId).result(),
    );

    expect(result).toBe(PaymentStatus.FAIL);
    expect(activities.checkPaymentStatus).toHaveBeenCalledTimes(1);
  });
});
