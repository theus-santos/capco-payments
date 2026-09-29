import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  TEMPORAL_ADDRESS: Joi.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: Joi.string().default('default'),
  TEMPORAL_TASK_QUEUE: Joi.string().default('payments'),

  MERCADOPAGO_ACCESS_TOKEN: Joi.string().allow('').default(''),
  MERCADOPAGO_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  APP_PUBLIC_URL: Joi.string().uri().default('http://localhost:3000'),
});
