import { ArgumentsHost } from '@nestjs/common';
import {
  InvalidAmountError,
  PaymentNotFoundError,
} from '../../../src/domain/errors/payment.error';
import { DomainExceptionFilter } from '../../../src/utils/domain-exception.filter';

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();
  let response: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;

  beforeEach(() => {
    response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
  });

  it('should return 404 for PaymentNotFoundError', () => {
    filter.catch(new PaymentNotFoundError('abc'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'PaymentNotFoundError',
      message: 'Payment abc not found',
    });
  });

  it('should return 422 for other domain errors', () => {
    filter.catch(new InvalidAmountError(-1), host);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        error: 'InvalidAmountError',
      }),
    );
  });
});
