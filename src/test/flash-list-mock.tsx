import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

interface MockFlashListProps<T> {
  data?: readonly T[] | null;
  renderItem: (info: { item: T; index: number }) => ReactElement | null;
  keyExtractor?: (item: T, index: number) => string;
  ListHeaderComponent?: ReactNode;
  ListEmptyComponent?: ReactNode;
}

/** FlashList measures its layout natively (its bundled jestSetup is broken in 2.0.x): render every row instead. */
export function FlashList<T>({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
}: MockFlashListProps<T>) {
  return (
    <View>
      {ListHeaderComponent}
      {data?.length
        ? data.map((item, index) => (
            <View key={keyExtractor ? keyExtractor(item, index) : index}>
              {renderItem({ item, index })}
            </View>
          ))
        : ListEmptyComponent}
    </View>
  );
}
