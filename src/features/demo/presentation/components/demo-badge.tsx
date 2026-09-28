import { Badge } from '@/core/ui';
import { useSessionStore } from '@/core/session';

export function DemoBadge() {
  const isDemo = useSessionStore((s) => s.mode === 'demo');
  return isDemo ? <Badge label="Demo" tone="accent" testID="demo-badge" /> : null;
}
