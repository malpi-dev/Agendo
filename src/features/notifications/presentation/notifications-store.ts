import { create } from 'zustand';

import type { PushStatus } from './notifications-service';

interface NotificationsState {
  permission: 'unknown' | PushStatus;
  /** Expo push token registered for this session (removed on sign out). */
  token?: string;
  setPermission: (permission: NotificationsState['permission']) => void;
  setRegistration: (permission: PushStatus, token?: string) => void;
  clearToken: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  permission: 'unknown',
  token: undefined,
  setPermission: (permission) => set({ permission }),
  setRegistration: (permission, token) => set({ permission, token }),
  clearToken: () => set({ token: undefined }),
}));
