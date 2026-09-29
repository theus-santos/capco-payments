import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { setupApp } from '../../src/config/app.config';
import { PaymentController } from '../../src/controllers/payment.controller';
import { PaymentRepository } from '../../src/domain/interfaces/payment.interface';
import { PaymentService } from '../../src/services/payment.service';
import { InMemoryPaymentRepository } from '../utils/in-memory-payment.repository';

const validPayment = {
  cpf: '529.982.247-25',
  description: 'Monthly subscription',
  amount: 99.9,
  paymentMethod: 'PIX',
};

describe('Payment (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        { provide: PaymentRepository, useClass: InMemoryPaymentRepository },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const createPayment = (body: object = validPayment) =>
    request(app.getHttpServer()).post('/api/payment').send(body);

  describe('POST /api/payment', () => {
    it('should create a PIX payment as PENDING', async () => {
      const response = await createPayment().expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        cpf: '52998224725',
        description: 'Monthly subscription',
        amount: 99.9,
        paymentMethod: 'PIX',
        status: 'PENDING',
      });
    });

    it.each([
      ['invalid CPF', { cpf: '111.111.111-11' }],
      ['negative amount', { amount: -1 }],
      ['amount with 3 decimals', { amount: 10.123 }],
      ['amount as string', { amount: '10' }],
      ['empty description', { description: '' }],
      ['unknown payment method', { paymentMethod: 'BOLETO' }],
      ['status in body', { status: 'PAID' }],
    ])('should return 400 for %s', async (_, data) => {
      await createPayment({ ...validPayment, ...data }).expect(400);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await createPayment({}).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'cpf must be a valid CPF',
          'paymentMethod must be one of the following values: PIX, CREDIT_CARD',
        ]),
      );
    });
  });

  describe('GET /api/payment/:id', () => {
    it('should return the payment', async () => {
      const { body: created } = await createPayment();

      const response = await request(app.getHttpServer())
        .get(`/api/payment/${created.id}`)
        .expect(200);

      expect(response.body).toEqual(created);
    });

    it('should return 404 when payment does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment/6f1c2b1e-8d3a-4c5b-9e7f-1a2b3c4d5e6f')
        .expect(404);

      expect(response.body.error).toBe('PaymentNotFoundError');
    });

    it('should return 400 when id is not a UUID', async () => {
      await request(app.getHttpServer()).get('/api/payment/123').expect(400);
    });
  });

  describe('PUT /api/payment/:id', () => {
    it('should update the status to PAID', async () => {
      const { body: created } = await createPayment();

      const response = await request(app.getHttpServer())
        .put(`/api/payment/${created.id}`)
        .send({ status: 'PAID' })
        .expect(200);

      expect(response.body.status).toBe('PAID');
    });

    it('should update description and amount', async () => {
      const { body: created } = await createPayment();

      const response = await request(app.getHttpServer())
        .put(`/api/payment/${created.id}`)
        .send({ description: 'Annual plan', amount: 999.9 })
        .expect(200);

      expect(response.body).toMatchObject({
        description: 'Annual plan',
        amount: 999.9,
      });
    });

    it('should return 422 for an invalid status transition', async () => {
      const { body: created } = await createPayment();
      const server = app.getHttpServer();

      await request(server)
        .put(`/api/payment/${created.id}`)
        .send({ status: 'FAIL' })
        .expect(200);

      const response = await request(server)
        .put(`/api/payment/${created.id}`)
        .send({ status: 'PAID' })
        .expect(422);

      expect(response.body.error).toBe('InvalidStatusTransitionError');
    });

    it('should return 400 for an unknown status', async () => {
      const { body: created } = await createPayment();

      await request(app.getHttpServer())
        .put(`/api/payment/${created.id}`)
        .send({ status: 'CANCELED' })
        .expect(400);
    });

    it('should not allow changing the CPF', async () => {
      const { body: created } = await createPayment();

      await request(app.getHttpServer())
        .put(`/api/payment/${created.id}`)
        .send({ cpf: '111.444.777-35' })
        .expect(400);
    });

    it('should return 404 when payment does not exist', async () => {
      await request(app.getHttpServer())
        .put('/api/payment/6f1c2b1e-8d3a-4c5b-9e7f-1a2b3c4d5e6f')
        .send({ status: 'PAID' })
        .expect(404);
    });
  });

  describe('GET /api/payment', () => {
    beforeEach(async () => {
      await createPayment();
      await createPayment({ ...validPayment, paymentMethod: 'CREDIT_CARD' });
      await createPayment({ ...validPayment, cpf: '111.444.777-35' });
    });

    it('should list all payments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment')
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should filter by CPF', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment')
        .query({ cpf: '529.982.247-25' })
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should filter by CPF and payment method', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment')
        .query({ cpf: '52998224725', paymentMethod: 'CREDIT_CARD' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].paymentMethod).toBe('CREDIT_CARD');
    });

    it('should return 400 for an invalid CPF filter', async () => {
      await request(app.getHttpServer())
        .get('/api/payment')
        .query({ cpf: '123' })
        .expect(400);
    });
  });
});
