import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';

import { ServiceCard } from '../components/service-card';
import { useBusiness } from '../hooks/use-business';
import { useServices } from '../hooks/use-services';

export default function ServicesScreen() {
  const services = useServices();
  const business = useBusiness();

  const header = (
    <View className="gap-1 pb-3 pt-4">
      <AppText variant="title">Book an appointment</AppText>
      {business.data ? <AppText tone="muted">{business.data.name}</AppText> : null}
    </View>
  );

  return (
    <Screen edges={['left', 'right']} testID="services-screen">
      {services.isPending ? (
        <View className="gap-3">
          {header}
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </View>
      ) : services.isError ? (
        <ErrorState
          error={services.error}
          onRetry={() => void services.refetch()}
          testID="services-error"
        />
      ) : (
        <FlashList
          data={services.data}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState title="No services available yet" testID="services-empty" />
          }
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={services.isRefetching}
          onRefresh={() => void services.refetch()}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              currency={business.data?.currency ?? 'USD'}
              onPress={(service) =>
                router.push({ pathname: '/book/[serviceId]', params: { serviceId: service.id } })
              }
            />
          )}
        />
      )}
    </Screen>
  );
}
