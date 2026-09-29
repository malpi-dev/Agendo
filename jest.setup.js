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

// Native notification APIs do not exist under Jest. Tests override the return values they care about.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));
