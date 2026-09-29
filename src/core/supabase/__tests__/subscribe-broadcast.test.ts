import { createFakeSupabase } from '@/test/fake-supabase';

import { subscribeToBroadcast } from '../subscribe-broadcast';

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function setup() {
  const fake = createFakeSupabase();
  const onChange = jest.fn();
  const onStatus = jest.fn();
  const off = subscribeToBroadcast(
    fake.client,
    'agendo:test',
    'appointment_changed',
    onChange,
    onStatus,
  );
  await flush();
  return { fake, onChange, onStatus, off, channel: fake.channels[0]! };
}

describe('subscribeToBroadcast', () => {
  it('opens a private channel after setting auth and reports connecting', async () => {
    const { fake, onStatus, channel } = await setup();
    expect(channel.topic).toBe('agendo:test');
    expect(channel.options).toEqual({ config: { private: true } });
    expect(fake.setAuth).toHaveBeenCalledTimes(1);
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith('connecting');
  });

  it('calls onChange for broadcast events only', async () => {
    const { onChange, channel } = await setup();
    channel.emit('appointment_changed');
    channel.emit('other');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reports live on SUBSCRIBED and paused on failures', async () => {
    const { onStatus, channel } = await setup();
    channel.status('SUBSCRIBED');
    expect(onStatus).toHaveBeenLastCalledWith('live');
    for (const failure of ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']) {
      channel.status(failure);
      expect(onStatus).toHaveBeenLastCalledWith('paused');
    }
  });

  it('refetches once on re-subscription but not on the first subscription', async () => {
    const { onChange, channel } = await setup();
    channel.status('SUBSCRIBED');
    expect(onChange).not.toHaveBeenCalled();
    channel.status('CHANNEL_ERROR');
    channel.status('SUBSCRIBED');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('removes the channel on unsubscribe and ignores late statuses', async () => {
    const { fake, onStatus, off, channel } = await setup();
    off();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
    onStatus.mockClear();
    channel.status('SUBSCRIBED');
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('does not subscribe if unsubscribed before auth resolves', async () => {
    const fake = createFakeSupabase();
    const off = subscribeToBroadcast(fake.client, 't', 'e', jest.fn());
    off();
    await flush();
    expect(fake.channels[0]!.subscribe).not.toHaveBeenCalled();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('reports paused when setAuth fails', async () => {
    const fake = createFakeSupabase();
    fake.setAuth.mockRejectedValueOnce(new Error('no session'));
    const onStatus = jest.fn();
    subscribeToBroadcast(fake.client, 't', 'e', jest.fn(), onStatus);
    await flush();
    expect(onStatus).toHaveBeenLastCalledWith('paused');
  });
});
