import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { WebhookSignatureValidator } from 'mercadopago';
import { MercadoPagoNotificationQuery } from './mercado-pago.interface';

@Injectable()
export class MercadoPagoSignatureGuard implements CanActivate {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.secret) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const query = request.query as MercadoPagoNotificationQuery;

    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers['x-signature'],
        xRequestId: request.headers['x-request-id'],
        dataId: query['data.id'],
        secret: this.secret,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Mercado Pago signature');
    }
  }
}
