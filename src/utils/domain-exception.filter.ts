import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain/errors/domain.error';
import {
  PaymentGatewayError,
  PaymentNotFoundError,
} from '../domain/errors/payment.error';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const statusCode = this.getStatusCode(exception);

    response.status(statusCode).json({
      statusCode,
      error: exception.name,
      message: exception.message,
    });
  }

  private getStatusCode(exception: DomainError): HttpStatus {
    if (exception instanceof PaymentNotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof PaymentGatewayError) return HttpStatus.BAD_GATEWAY;
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
