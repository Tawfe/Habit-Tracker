export type Ecosystem = 'apns' | 'fcm' | 'hms';

export type PushTarget = {
  ecosystem: Ecosystem;
  token: string;
};

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export interface PushProvider {
  send(token: string, msg: PushMessage): Promise<void>;
}
