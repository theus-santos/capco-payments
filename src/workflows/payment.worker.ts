import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NativeConnection, Worker } from '@temporalio/worker';
import {
  PaymentGateway,
  PaymentRepository,
} from '../domain/interfaces/payment.interface';
import { createPaymentActivities } from './payment.activities';

@Injectable()
export class PaymentWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentWorker.name);
  private connection?: NativeConnection;
  private worker?: Worker;
  private running?: Promise<void>;

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.connection = await NativeConnection.connect({
      address: this.config.getOrThrow<string>('TEMPORAL_ADDRESS'),
    });

    this.worker = await Worker.create({
      connection: this.connection,
      namespace: this.config.getOrThrow<string>('TEMPORAL_NAMESPACE'),
      taskQueue: this.config.getOrThrow<string>('TEMPORAL_TASK_QUEUE'),
      workflowsPath: require.resolve('./payment.workflow'),
      activities: createPaymentActivities(
        this.paymentRepository,
        this.paymentGateway,
      ),
    });

    this.running = this.worker.run();
    this.logger.log('Temporal worker started');
  }

  async onApplicationShutdown(): Promise<void> {
    this.worker?.shutdown();
    await this.running;
    await this.connection?.close();
  }
}
