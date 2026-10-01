import { create } from 'zustand';
import ProfileService from '../services/profile.service';
import MessageService from '../services/message.service';

interface BadgeState {
  unseenInterests: number;
  unreadMessages: number;
  refresh: () => Promise<void>;
  clearInterests: () => void;
}

export const useBadgeStore = create<BadgeState>((set) => ({
  unseenInterests: 0,
  unreadMessages: 0,
  refresh: async () => {
    const [interests, messages] = await Promise.allSettled([
      ProfileService.getUnseenInterestCount(),
      MessageService.getUnreadCount(),
    ]);
    set((s) => ({
      unseenInterests: interests.status === 'fulfilled' ? interests.value : s.unseenInterests,
      unreadMessages: messages.status === 'fulfilled' ? messages.value : s.unreadMessages,
    }));
  },
  clearInterests: () => set({ unseenInterests: 0 }),
}));
