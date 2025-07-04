// stores/taskStore.ts - Zustand Store for Task Management
import { create } from 'zustand';
import { useSharedValue } from 'react-native-reanimated';
import dayjs from 'dayjs';
import TasksDatabase from '@/lib/TaskDatabase';
import { getItem, setItem } from '@/lib/Storage';
import { calculateNextDisplayInstanceDate, calculateActualDueDate } from '@/features/tasks/utils';
import { FOLDER_ORDER_KEY } from '@/features/tasks/constants';
import type { Task, FolderOrder, DisplayableTaskItem, DisplayTaskOriginal } from '@/features/tasks/types';

export type SortMode = 'deadline' | 'custom';
export type ActiveTab = 'incomplete' | 'completed';

interface TaskState {
  // Core data
  tasks: Task[];
  folderOrder: FolderOrder;
  activeTab: ActiveTab;
  sortMode: SortMode;
  
  // UI state
  loading: boolean;
  isDataInitialized: boolean;
  isRefreshing: boolean;
  isTaskReorderMode: boolean;
  
  // Computed data
  baseProcessedTasks: DisplayTaskOriginal[];
  
  // ===== DRAG & DROP STATE =====
  pendingTasksByFolder: Map<string, DisplayableTaskItem[]>;
  hasChangesByFolder: Map<string, boolean>;
  isScrollEnabled: boolean;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  setFolderOrder: (order: FolderOrder) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSortMode: (mode: SortMode) => void;
  setLoading: (loading: boolean) => void;
  setIsDataInitialized: (initialized: boolean) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setIsTaskReorderMode: (mode: boolean) => void;
  
  // Task operations
  toggleTaskDone: (id: string, instanceDateStr?: string) => Promise<void>;
  loadData: () => Promise<void>;
  syncTasksToDatabase: (prevTasks: Task[], newTasks: Task[]) => Promise<void>;
  
  // Drag & drop operations
  handleLongPressStart: (itemId: string, folderName: string) => void;
  handleDragUpdate: (translationY: number, itemId: string, folderName: string) => void;
  handleDragEnd: (fromIndex: number, translationY: number, itemId: string, folderName: string) => void;
  handleTaskReorderConfirm: () => Promise<void>;
  handleTaskReorderCancel: () => void;
}

// Create Zustand store
export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  folderOrder: [],
  activeTab: 'incomplete',
  sortMode: 'deadline',
  loading: true,
  isDataInitialized: false,
  isRefreshing: false,
  isTaskReorderMode: false,
  baseProcessedTasks: [],
  pendingTasksByFolder: new Map(),
  hasChangesByFolder: new Map(),
  isScrollEnabled: true,

  // Actions
  setTasks: (tasks) => {
    // Update computed baseProcessedTasks
    const baseProcessedTasks = tasks.map(task => {
      const displayDateUtc = task.deadlineDetails?.repeatFrequency && task.deadlineDetails.repeatStartDate
        ? calculateNextDisplayInstanceDate(task)
        : calculateActualDueDate(task);
      let isTaskFullyCompleted = false;
      if (task.deadlineDetails?.repeatFrequency) {
        const nextInstanceIsNull = displayDateUtc === null;
        let repeatEndsPassed = false;
        const repeatEnds = task.deadlineDetails.repeatEnds;
        if (repeatEnds) {
          switch (repeatEnds.type) {
            case 'on_date': 
              if (typeof repeatEnds.date === 'string') { 
                repeatEndsPassed = dayjs.utc(repeatEnds.date).endOf('day').isBefore(dayjs().utc()); 
              } 
              break;
            case 'count': 
              if (typeof repeatEnds.count === 'number') { 
                if ((task.completedInstanceDates?.length || 0) >= repeatEnds.count) { 
                  repeatEndsPassed = true; 
                } 
              } 
              break;
          }
        }
        isTaskFullyCompleted = nextInstanceIsNull || repeatEndsPassed;
      } else { 
        isTaskFullyCompleted = !!task.completedAt; 
      }
      return { ...task, displaySortDate: displayDateUtc, isTaskFullyCompleted };
    });
    
    // Update both tasks and baseProcessedTasks in single set call
    set({ tasks, baseProcessedTasks });
  },

  setFolderOrder: (folderOrder) => set({ folderOrder }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSortMode: (sortMode) => set({ sortMode }),
  setLoading: (loading) => set({ loading }),
  setIsDataInitialized: (isDataInitialized) => set({ isDataInitialized }),
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  setIsTaskReorderMode: (isTaskReorderMode) => set({ isTaskReorderMode }),

  // Task operations
  toggleTaskDone: async (id, instanceDateStr) => {
    const { tasks, syncTasksToDatabase } = get();
    const newTasks = tasks.map(task => {
      if (task.id === id) {
        if (task.deadlineDetails?.repeatFrequency) {
          let newCompletedDates = task.completedInstanceDates ? [...task.completedInstanceDates] : [];
          if (instanceDateStr) {
            const exists = newCompletedDates.includes(instanceDateStr);
            if (exists) {
              newCompletedDates = newCompletedDates.filter(d => d !== instanceDateStr);
            } else {
              newCompletedDates.push(instanceDateStr);
            }
          }
          return { ...task, completedInstanceDates: newCompletedDates };
        } else {
          const wasCompleted = !!task.completedAt;
          return { 
            ...task, 
            completedAt: wasCompleted ? undefined : dayjs.utc().toISOString() 
          };
        }
      }
      return task;
    });

    try {
      get().setTasks(newTasks);
      await syncTasksToDatabase(tasks, newTasks);
    } catch (error) {
      console.error('Failed to toggle task:', error);
      get().setTasks(tasks); // Rollback on error
    }
  },

  loadData: async () => {
    const { setTasks, setFolderOrder, setLoading, setIsDataInitialized, isDataInitialized } = get();
    
    if (!isDataInitialized) {
      setLoading(true);
    }
    
    try {
      const [taskRows, rawOrderData] = await Promise.all([
        TasksDatabase.getAllTasks(),
        getItem(FOLDER_ORDER_KEY),
      ]);
      
      setTasks(taskRows.map(t => JSON.parse(t)));
      setFolderOrder(rawOrderData ? JSON.parse(rawOrderData) : []);
    } catch (e) {
      console.error('Failed to load data from storage:', e);
      setTasks([]);
      setFolderOrder([]);
    } finally {
      if (!isDataInitialized) {
        setLoading(false);
        setIsDataInitialized(true);
      }
    }
  },

  syncTasksToDatabase: async (prevTasks, newTasks) => {
    try {
      const prevIds = new Set(prevTasks.map(t => t.id));
      const newIds = new Set(newTasks.map(t => t.id));
      
      for (const task of newTasks) {
        await TasksDatabase.saveTask(task as any);
      }
      
      for (const id of prevIds) {
        if (!newIds.has(id)) {
          await TasksDatabase.deleteTask(id);
        }
      }
    } catch (e) {
      console.error('Failed to sync tasks with DB:', e);
      throw e;
    }
  },

  // ===== DRAG & DROP OPERATIONS =====
  handleLongPressStart: (itemId, folderName) => {
    // Performance: Removed console.log
    
    const { baseProcessedTasks, activeTab } = get();
    const noFolderName = 'フォルダなし'; // TODO: Get from translation
    
    if (get().isTaskReorderMode) return;
    
    // Initialize pending tasks for all folders
    const newPendingTasksByFolder = new Map<string, DisplayableTaskItem[]>();
    const newHasChangesByFolder = new Map<string, boolean>();
    
    // Get all folder names from current page data
    const allFolderNames = Array.from(new Set(baseProcessedTasks.map(t => t.folder || noFolderName)));
    
    for (const currentFolderName of allFolderNames) {
      const folderTasks = baseProcessedTasks
        .filter(task => (task.folder || noFolderName) === currentFolderName)
        .filter(task => {
          if (activeTab === 'completed') return task.isTaskFullyCompleted;
          return !task.isTaskFullyCompleted;
        })
        .map(task => ({ ...task, keyId: task.id }));
      
      if (folderTasks.length > 0) {
        newPendingTasksByFolder.set(currentFolderName, [...folderTasks]);
        newHasChangesByFolder.set(currentFolderName, false);
      }
    }
    
    set({
      isTaskReorderMode: true,
      pendingTasksByFolder: newPendingTasksByFolder,
      hasChangesByFolder: newHasChangesByFolder,
    });
  },

  handleDragUpdate: (translationY, itemId, folderName) => {
    // This is handled by shared values in the UI thread
    // State updates happen in handleDragEnd
  },

  handleDragEnd: (fromIndex, translationY, itemId, folderName) => {
    // Performance: Removed console.log
    
    const { pendingTasksByFolder, hasChangesByFolder } = get();
    const currentPendingTasks = pendingTasksByFolder.get(folderName);
    
    if (!currentPendingTasks || currentPendingTasks.length === 0) {
      console.error('No pending tasks found for folder:', folderName);
      return;
    }
    
    // Recalculate actual index
    const actualFromIndex = currentPendingTasks.findIndex(task => task.keyId === itemId);
    if (actualFromIndex === -1) {
      console.error('Task not found in pending tasks:', itemId);
      return;
    }
    
    // Calculate target index
    const itemHeight = 80;
    const moveDistance = Math.round(translationY / itemHeight);
    const newIndex = Math.max(0, Math.min(currentPendingTasks.length - 1, actualFromIndex + moveDistance));
    
    if (newIndex !== actualFromIndex && Math.abs(moveDistance) >= 1) {
      // Performance: Removed console.log
      
      const newTasks = [...currentPendingTasks];
      const [movedItem] = newTasks.splice(actualFromIndex, 1);
      newTasks.splice(newIndex, 0, movedItem);
      
      const newPendingTasksByFolder = new Map(pendingTasksByFolder);
      newPendingTasksByFolder.set(folderName, newTasks);
      
      const newHasChangesByFolder = new Map(hasChangesByFolder);
      newHasChangesByFolder.set(folderName, true);
      
      set({
        pendingTasksByFolder: newPendingTasksByFolder,
        hasChangesByFolder: newHasChangesByFolder,
      });
    }
  },

  handleTaskReorderConfirm: async () => {
    // Performance: Removed console.log
    
    const { tasks, pendingTasksByFolder, folderOrder, syncTasksToDatabase } = get();
    const backupTasks = [...tasks];
    let updatedTasks = [...tasks];
    
    try {
      // Helper function to get base order for folder
      const getBaseOrderForFolder = (folderName: string): number => {
        const folderIndex = folderOrder.findIndex(name => name === folderName);
        return folderIndex >= 0 ? folderIndex * 1000 : (folderOrder.length * 1000) + (folderName.length * 100);
      };
      
      // Process each folder's pending tasks
      for (const [folderName, pendingTasks] of pendingTasksByFolder.entries()) {
        const baseOrder = getBaseOrderForFolder(folderName);
        
        pendingTasks.forEach((pendingTask, newIndex) => {
          const taskIndex = updatedTasks.findIndex(task => task.id === pendingTask.id);
          if (taskIndex !== -1) {
            const newCustomOrder = baseOrder + (newIndex * 10);
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], customOrder: newCustomOrder };
          }
        });
      }
      
      // Update state and sync to database
      get().setTasks(updatedTasks);
      await syncTasksToDatabase(backupTasks, updatedTasks);
      
      // Auto-exit reorder mode
      setTimeout(() => {
        get().setIsTaskReorderMode(false);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to confirm task reorder:', error);
      get().setTasks(backupTasks); // Rollback
    }
  },

  handleTaskReorderCancel: () => {
    // Performance: Removed console.log
    set({
      isTaskReorderMode: false,
      pendingTasksByFolder: new Map(),
      hasChangesByFolder: new Map(),
    });
  },
}));

// ===== SHARED VALUES FOR DRAG & DROP =====
// These need to be created outside the store since they're used in worklets
export const createDragSharedValues = () => ({
  isDragMode: useSharedValue(false),
  draggedItemId: useSharedValue<string>(''),
  draggedItemY: useSharedValue(0),
  scrollEnabled: useSharedValue(true),
  dragTargetIndex: useSharedValue(-1),
  draggedItemOriginalIndex: useSharedValue(-1),
  draggedItemFolderName: useSharedValue<string>(''),
});