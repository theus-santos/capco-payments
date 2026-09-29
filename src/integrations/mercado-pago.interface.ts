export interface MercadoPagoNotification {
  action?: string;
  type?: string;
  data?: {
    id?: string | number;
  };
}

export interface MercadoPagoNotificationQuery {
  type?: string;
  topic?: string;
  id?: string;
  'data.id'?: string;
}
