# capco-payments

Payment API with PIX and credit card (Mercado Pago Checkout Pro), built with NestJS, PostgreSQL and Temporal.

## Running

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run start:dev
```

Set `MERCADOPAGO_ACCESS_TOKEN` in `.env` with a Mercado Pago test token. For webhooks, `APP_PUBLIC_URL` must be a public `https` URL (e.g. ngrok).

## Endpoints

| Method | Route                              |
| ------ | ---------------------------------- |
| `POST` | `/api/payment`                     |
| `PUT`  | `/api/payment/:id`                 |
| `GET`  | `/api/payment/:id`                 |
| `GET`  | `/api/payment?cpf=&paymentMethod=` |

```bash
curl -X POST http://localhost:3000/api/payment \
  -H 'Content-Type: application/json' \
  -d '{"cpf":"529.982.247-25","description":"Monthly plan","amount":49.9,"paymentMethod":"CREDIT_CARD"}'
```

## Credit card flow

A Temporal workflow creates the Mercado Pago preference, waits for the webhook (with polling as fallback) and sets the payment to `PAID`, or `FAIL` if it is not approved within 30 minutes. PIX payments are only saved as `PENDING`.

## Tests

```bash
npm test
npm run test:e2e
```
