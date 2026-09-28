import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { useRepositories } from '@/core/di';
import { formatPrice } from '@/core/time';
import { AppText, Card, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';

// Provisional: phase 06 replaces this with the real catalog and booking entry point.
export default function HomeScreen() {
  const { catalog } = useRepositories();
  const services = useQuery({ queryKey: ['services'], queryFn: () => catalog.listServices() });

  return (
    <Screen scroll edges={['left', 'right']} className="gap-3 pt-4" testID="home-screen">
      <AppText variant="title">Services</AppText>
      {services.isPending ? (
        <View className="gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </View>
      ) : services.isError ? (
        <ErrorState error={services.error} onRetry={() => void services.refetch()} />
      ) : services.data.length === 0 ? (
        <EmptyState title="No services yet" />
      ) : (
        services.data.map((s) => (
          <Card key={s.id} testID={`service-${s.id}`}>
            <AppText variant="subtitle">{s.name}</AppText>
            <AppText tone="muted" variant="caption">
              {s.durationMinutes} min · {formatPrice(s.priceCents, 'USD')}
            </AppText>
          </Card>
        ))
      )}
    </Screen>
  );
}
