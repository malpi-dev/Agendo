export type PushPlatform = 'android' | 'ios';

export interface PushTokenRepository {
  /** Upsert. */
  register(token: string, platform: PushPlatform): Promise<void>;
  remove(token: string): Promise<void>;
}
