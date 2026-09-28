// FlashList measures its layout natively (its bundled jestSetup is broken in 2.0.x): render every row instead.
jest.mock('@shopify/flash-list', () => require('./src/test/flash-list-mock'));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated 4 needs native worklets, which do not exist under Jest. Minimal mock: animations become no-ops.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const animation = { duration: () => animation, delay: () => animation };
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withRepeat: (value) => value,
    withTiming: (value) => value,
    FadeIn: animation,
    FadeOut: animation,
    FadeInDown: animation,
    FadeOutDown: animation,
    LinearTransition: animation,
  };
});
