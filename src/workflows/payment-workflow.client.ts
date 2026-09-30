import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, WorkflowNotFoundError } from '@temporalio/client';
import { setTimeout as sleep } from 'timers/promises';
import {
  CHECKOUT_WAIT_ATTEMPTS,
  CHECKOUT_WAIT_INTERVAL_MS,
  checkoutStateQuery,
  PAYMENT_WORKFLOW_PREFIX,
  paymentNotificationSignal,
} from '../constants/payment-workflow.constant';
import { PaymentGatewayError } from '../domain/errors/payment.error';
import {
  PaymentCheckout,
  PaymentWorkflow,
} from '../domain/interfaces/payment.interface';
import { creditCardPaymentWorkflow } from './payment.workflow';

@Injectable()
export class TemporalPaymentWorkflow extends PaymentWorkflow {
  private readonly taskQueue: string;

  constructor(
    private readonly client: Client,
    config: ConfigService,
  ) {
    super();
    this.taskQueue = config.getOrThrow<string>('TEMPORAL_TASK_QUEUE');
  }

  async start(paymentId: string): Promise<PaymentCheckout> {
    const handle = await this.client.workflow.start(creditCardPaymentWorkflow, {
      workflowId: this.workflowId(paymentId),
      taskQueue: this.taskQueue,
      args: [paymentId],
    });

    for (let attempt = 0; attempt < CHECKOUT_WAIT_ATTEMPTS; attempt++) {
      const state = await handle.query(checkoutStateQuery);

      if (state.checkout) return state.checkout;
      if (state.failed) {
        throw new PaymentGatewayError('checkout could not be created');
      }

      await sleep(CHECKOUT_WAIT_INTERVAL_MS);
    }

    throw new PaymentGatewayError('checkout creation timed out');
  }

  async notify(paymentId: string): Promise<boolean> {
    try {
      await this.client.workflow
        .getHandle(this.workflowId(paymentId))
        .signal(paymentNotificationSignal);
      return true;
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) return false;
      throw error;
    }
  }

  private workflowId(paymentId: string): string {
    return `${PAYMENT_WORKFLOW_PREFIX}-${paymentId}`;
  }
}
