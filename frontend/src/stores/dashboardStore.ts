import { create } from 'zustand';

interface DashboardState {
  activeSection: string;
  refreshTrigger: number;
  setActiveSection: (section: string) => void;
  triggerRefresh: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeSection: 'overview',
  refreshTrigger: 0,
  setActiveSection: (section: string) => set({ activeSection: section }),
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
