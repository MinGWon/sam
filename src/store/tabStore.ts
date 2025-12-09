import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TabState {
  // AttendanceViewer 상태
  attendanceViewer?: {
    searchTerm: string;
    selectedGrade: string;
    selectedClass: string;
    displayedStudents: any[];
    selectedStudent: any | null;
    dateRange: { start: string; end: string };
  };
  
  // StudentManagement 상태
  studentManagement?: {
    searchTerm: string;
    selectedStudents: string[];
    sortBy: string;
  };
  
  // DeviceManagement 상태
  deviceManagement?: {
    selectedDevice: string | null;
    filterStatus: string;
  };
}

interface TabStore {
  tabStates: Record<string, TabState>;
  setTabState: (tabId: string, state: Partial<TabState>) => void;
  getTabState: (tabId: string) => TabState | undefined;
  removeTabState: (tabId: string) => void;
  clearAllStates: () => void;
}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabStates: {},
      
      setTabState: (tabId, state) =>
        set((prev) => ({
          tabStates: {
            ...prev.tabStates,
            [tabId]: {
              ...prev.tabStates[tabId],
              ...state,
            },
          },
        })),
      
      getTabState: (tabId) => get().tabStates[tabId],
      
      removeTabState: (tabId) =>
        set((prev) => {
          const newStates = { ...prev.tabStates };
          delete newStates[tabId];
          return { tabStates: newStates };
        }),
      
      clearAllStates: () => set({ tabStates: {} }),
    }),
    {
      name: 'tab-storage',
      partialize: (state) => ({ tabStates: state.tabStates }),
    }
  )
);

// 직접 상태를 가져오는 유틸리티 함수 (React 외부에서 사용 가능)
export const getTabStateSync = (tabId: string) => {
  return useTabStore.getState().getTabState(tabId);
};
