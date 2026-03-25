export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  endpoint_arn: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}
