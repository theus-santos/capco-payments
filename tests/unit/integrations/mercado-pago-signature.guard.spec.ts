import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { MercadoPagoSignatureGuard } from '../../../src/integrations/mercado-pago-signature.guard';

const SECRET = 'webhook-secret';

const makeGuard = (secret: string) =>
  new MercadoPagoSignatureGuard({
    get: () => secret,
  } as unknown as ConfigService);

const makeContext = (headers: Record<string, string>, dataId = '123') =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, query: { 'data.id': dataId } }),
    }),
  }) as unknown as ExecutionContext;

const sign = (dataId: string, requestId: string, ts: number) => {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac('sha256', SECRET).update(manifest).digest('hex');
  return `ts=${ts},v1=${hash}`;
};

describe('MercadoPagoSignatureGuard', () => {
  it('should allow any request when no secret is configured', () => {
    expect(makeGuard('').canActivate(makeContext({}))).toBe(true);
  });

  it('should allow a request with a valid signature', () => {
    const ts = Math.floor(Date.now() / 1000);
    const context = makeContext({
      'x-signature': sign('123', 'req-1', ts),
      'x-request-id': 'req-1',
    });

    expect(makeGuard(SECRET).canActivate(context)).toBe(true);
  });

  it('should reject a request with an invalid signature', () => {
    const ts = Math.floor(Date.now() / 1000);
    const context = makeContext({
      'x-signature': `ts=${ts},v1=invalid`,
      'x-request-id': 'req-1',
    });

    expect(() => makeGuard(SECRET).canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a request without signature', () => {
    expect(() => makeGuard(SECRET).canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });
});
