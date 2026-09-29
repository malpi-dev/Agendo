import type { AgendoSupabaseClient } from './client';

export type BroadcastStatus = 'connecting' | 'live' | 'paused';

/**
 * Subscribes to a private Realtime Broadcast channel (messages are sent by database triggers,
 * see the `agendo_*_broadcast_read` policies) and returns an unsubscribe function.
 *
 * `onChange` fires for every `event` message and once more after a re-subscription, because
 * events may have been missed while the connection was down.
 */
export function subscribeToBroadcast(
  client: AgendoSupabaseClient,
  topic: string,
  event: string,
  onChange: () => void,
  onStatus?: (status: BroadcastStatus) => void,
): () => void {
  const channel = client.channel(topic, { config: { private: true } });
  let closed = false;
  let wasLive = false;

  channel.on('broadcast', { event }, () => onChange());
  onStatus?.('connecting');

  // Private channels are authorized with the user JWT: it must be set before subscribing.
  void client.realtime
    .setAuth()
    .then(() => {
      if (closed) return;
      channel.subscribe((status) => {
        if (closed) return;
        if (status === 'SUBSCRIBED') {
          if (wasLive) onChange();
          wasLive = true;
          onStatus?.('live');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          onStatus?.('paused');
        }
      });
    })
    .catch(() => {
      if (!closed) onStatus?.('paused');
    });

  return () => {
    closed = true;
    void client.removeChannel(channel);
  };
}
