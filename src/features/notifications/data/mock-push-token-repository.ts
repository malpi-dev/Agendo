import type { PushPlatform, PushTokenRepository } from '../domain/push-token-repository';

/** In-memory tokens (demo mode and tests). */
export class MockPushTokenRepository implements PushTokenRepository {
  readonly tokens = new Map<string, PushPlatform>();

  async register(token: string, platform: PushPlatform): Promise<void> {
    this.tokens.set(token, platform);
  }

  async remove(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}
