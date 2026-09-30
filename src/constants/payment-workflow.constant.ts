import {
  ActivityOptions,
  defineQuery,
  defineSignal,
} from '@temporalio/workflow';
import type { CheckoutState } from '../interfaces/payment-workflow.interface';

export const CHECKOUT_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3 },
};

export const STATUS_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: '30 seconds',
  retry: { maximumInterval: '1 minute' },
};

export const PAYMENT_WORKFLOW_PREFIX = 'payment';

export const PAYMENT_EXPIRATION_MS = 30 * 60 * 1000;

export const STATUS_CHECK_INTERVAL_MS = 60 * 1000;

export const CHECKOUT_WAIT_ATTEMPTS = 60;

export const CHECKOUT_WAIT_INTERVAL_MS = 500;

export const paymentNotificationSignal = defineSignal('paymentNotification');

export const checkoutStateQuery = defineQuery<CheckoutState>('checkoutState');
