import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { formatPrice } from '@/core/time';
import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';

import { ProfessionalRow } from '../components/professional-row';
import { useBusiness } from '../hooks/use-business';
import { useProfessionals } from '../hooks/use-professionals';
import { useService } from '../hooks/use-services';

export default function ProfessionalsScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const service = useService(serviceId);
  const business = useBusiness();
  const professionals = useProfessionals(serviceId);

  const error = service.error ?? professionals.error;

  return (
    <Screen scroll edges={['left', 'right']} className="gap-3 pt-4" testID="professionals-screen">
      {service.data ? (
        <View className="pb-1">
          <AppText variant="subtitle">{service.data.name}</AppText>
          <AppText tone="muted" variant="caption" tabular>
            {service.data.durationMinutes} min ·{' '}
            {formatPrice(service.data.priceCents, business.data?.currency ?? 'USD')}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void service.refetch();
            void professionals.refetch();
          }}
          testID="professionals-error"
        />
      ) : !professionals.data ? (
        <View className="gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </View>
      ) : professionals.data.length === 0 ? (
        <EmptyState title="No one offers this service right now" testID="professionals-empty" />
      ) : (
        professionals.data.map((p) => (
          <ProfessionalRow
            key={p.id}
            professional={p}
            onPress={(professional) =>
              router.push({
                pathname: '/book/[serviceId]/[professionalId]',
                params: { serviceId, professionalId: professional.id },
              })
            }
          />
        ))
      )}
    </Screen>
  );
}
