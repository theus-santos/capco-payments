import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MercadoPagoSignatureGuard } from '../integrations/mercado-pago-signature.guard';
import type {
  MercadoPagoNotification,
  MercadoPagoNotificationQuery,
} from '../integrations/mercado-pago.interface';
import { PaymentService } from '../services/payment.service';

@Controller('payment/webhook')
export class MercadoPagoWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(MercadoPagoSignatureGuard)
  async handle(
    @Body() body: MercadoPagoNotification,
    @Query() query: MercadoPagoNotificationQuery,
  ): Promise<void> {
    const type = body?.type ?? query.type ?? query.topic;
    const transactionId = body?.data?.id ?? query['data.id'] ?? query.id;

    if (type !== 'payment' || !transactionId) return;

    await this.paymentService.handleGatewayNotification(String(transactionId));
  }
}
