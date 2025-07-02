// app/features/tasks/components/TaskViewPager.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Dimensions, FlatList, ScrollView } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent, type PagerViewOnPageScrollEvent } from 'react-native-pager-view';
import type { TaskScreenStyles } from '@/features/tasks/styles';
import type { DisplayableTaskItem, SelectableItem } from '@/features/tasks/types';
import { TaskFolder, type Props as TaskFolderProps } from '@/features/tasks/components/TaskFolder';
import type { ActiveTab, FolderTab } from '@/features/tasks/hooks/useTasksScreenLogic';
import { SELECTION_BAR_HEIGHT } from '@/features/tasks/constants';

type TaskViewPagerProps = {
  styles: TaskScreenStyles;
  pagerRef: React.RefObject<PagerView>;
  folderTabs: FolderTab[];
  selectedTabIndex: number; // ★ プロパティ名を変更
  handlePageSelected: (event: PagerViewOnPageSelectedEvent) => void;
  handlePageScroll: (event: PagerViewOnPageScrollEvent) => void;
  activeTab: ActiveTab;
  toggleTaskDone: (id: string, instanceDate?: string) => void;
  isReordering: boolean;
  draggingFolder: string | null;
  setDraggingFolder: (name: string | null) => void;
  moveFolderOrder: (folderName: string, direction: 'up' | 'down') => void;
  stopReordering: () => void;
  isSelecting: boolean;
  selectedItems: SelectableItem[];
  onLongPressSelectItem: (type: 'task' | 'folder', id: string) => void;
  noFolderName: string;
  t: (key: string, options?: any) => string;
  baseProcessedTasks: DisplayableTaskItem[]; // ★ Replace memoizedPagesData with raw processed tasks
  sortMode?: 'deadline' | 'custom';
  isTaskReorderMode?: boolean;
  onTaskReorder?: (folderName: string) => (fromIndex: number, toIndex: number) => Promise<void>;
  onFolderReorder?: (folderName: string, fromIndex: number, toIndex: number) => void;
  onChangeSortMode?: (sortMode: 'deadline' | 'custom') => void;
  onReorderModeChange?: (isReorderMode: boolean, hasChanges: boolean, onConfirm: () => void, onCancel: () => void) => void;
  folderOrder?: string[];
  
  // ===== CENTRALIZED DRAG & DROP PROPS =====
  // State from useTasksScreenLogic
  pendingTasksByFolder?: Map<string, DisplayableTaskItem[]>;
  hasChangesByFolder?: Map<string, boolean>;
  isScrollEnabled?: boolean;
  // Handlers from useTasksScreenLogic
  onLongPressStart?: (itemId: string, folderName: string) => void;
  onDragUpdate?: (translationY: number, itemId: string, folderName: string) => void;
  onDragEnd?: (fromIndex: number, translationY: number, itemId: string, folderName: string) => void;
  // Shared values from useTasksScreenLogic
  isDragMode?: any; // SharedValue<boolean>
  draggedItemId?: any; // SharedValue<string>
  dragTargetIndex?: any; // SharedValue<number>
  draggedItemOriginalIndex?: any; // SharedValue<number>
  draggedItemFolderName?: any; // SharedValue<string>
};

const windowWidth = Dimensions.get('window').width;

export const TaskViewPager = React.memo<TaskViewPagerProps>(({
  styles,
  pagerRef,
  folderTabs,
  selectedTabIndex, // ★ プロパティ名を変更
  handlePageSelected,
  handlePageScroll,
  activeTab,
  toggleTaskDone,
  isReordering,
  draggingFolder,
  setDraggingFolder,
  moveFolderOrder,
  stopReordering,
  isSelecting,
  selectedItems,
  onLongPressSelectItem,
  noFolderName,
  t,
  baseProcessedTasks,
  sortMode = 'deadline',
  isTaskReorderMode = false,
  onTaskReorder,
  onFolderReorder,
  onChangeSortMode,
  onReorderModeChange,
  folderOrder = [],
  
  // ===== CENTRALIZED DRAG & DROP PROPS =====
  pendingTasksByFolder,
  hasChangesByFolder,
  isScrollEnabled,
  onLongPressStart,
  onDragUpdate,
  onDragEnd,
  isDragMode,
  draggedItemId,
  dragTargetIndex,
  draggedItemOriginalIndex,
  draggedItemFolderName,
}) => {
  // State to control ScrollView scroll enabled
  const [isTaskDragging, setIsTaskDragging] = useState(false);
  
  // Check if any folder is in draggable mode
  const isInDraggableMode = useMemo(() => {
    return sortMode === 'custom' && activeTab === 'incomplete' && !isSelecting;
  }, [sortMode, activeTab, isSelecting]);
  
  // Callback to handle task drag state changes
  const handleTaskDragStateChange = useCallback((isDragging: boolean) => {
    setIsTaskDragging(isDragging);
  }, []);
  
  // ★ PERFORMANCE OPTIMIZATION: Simplified page rendering with individual folder processing
  const renderPageContent = useMemo(() => (pageFolderName: string, pageIndex: number) => {
    // Determine which folders to render based on page type
    let foldersToRender: string[];
    if (pageFolderName === 'all') {
      // For 'all' page, render all folders in order
      const allFolderNames = Array.from(new Set(baseProcessedTasks.map(t => t.folder || noFolderName)));
      const ordered = folderOrder.filter(name => allFolderNames.includes(name) && name !== noFolderName);
      const unordered = allFolderNames.filter(name => !folderOrder.includes(name) && name !== noFolderName).sort();
      foldersToRender = [...ordered, ...unordered];
      
      if (allFolderNames.includes(noFolderName)) {
        foldersToRender.push(noFolderName);
      }
    } else {
      // For specific folder page, render only that folder
      foldersToRender = [pageFolderName];
    }

    return (
      <ScrollView 
        key={`page-${pageFolderName}-${pageIndex}`} 
        style={{ width: windowWidth, flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: isSelecting ? SELECTION_BAR_HEIGHT + 20 : 20 }}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={8}
        removeClippedSubviews={true}
        nestedScrollEnabled={true}
        overScrollMode="never"
        bounces={true}
        bouncesZoom={false}
        decelerationRate={0.998}
        snapToAlignment="start"
        scrollEnabled={!isTaskDragging}
      >
          {foldersToRender.map((folderName, folderIndex) => {
            const taskFolderProps: Omit<TaskFolderProps, 'isCollapsed' | 'toggleFolder' | 'onRefreshTasks'> = {
              folderName,
              tasks: baseProcessedTasks, // ★ Pass raw tasks - TaskFolder will filter them
              onToggleTaskDone: toggleTaskDone,
              isReordering: isReordering && draggingFolder === folderName && folderName !== noFolderName && pageFolderName === 'all',
              setDraggingFolder,
              draggingFolder,
              moveFolder: moveFolderOrder,
              stopReordering,
              isSelecting,
              selectedIds: selectedItems.map(it => it.id),
              onLongPressSelect: onLongPressSelectItem,
              currentTab: activeTab,
              sortMode,
              isTaskReorderMode,
              onTaskReorder: onTaskReorder ? onTaskReorder(folderName) : undefined,
              onFolderReorder,
              folderIndex: 0,
              totalFolders: 2,
              onTaskDragStateChange: handleTaskDragStateChange,
              onChangeSortMode,
              onReorderModeChange,
              
              // ===== CENTRALIZED DRAG & DROP PROPS =====
              pendingTasks: pendingTasksByFolder?.get(folderName),
              hasChanges: hasChangesByFolder?.get(folderName) || false,
              isScrollEnabled,
              onLongPressStart,
              onDragUpdate,
              onDragEnd,
              isDragMode,
              draggedItemId,
              dragTargetIndex,
              draggedItemOriginalIndex,
              draggedItemFolderName,
            };
            return <TaskFolder key={`${pageFolderName}-${folderName}-${pageIndex}`} {...taskFolderProps} />;
          })}
          {baseProcessedTasks.length === 0 && (
             <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>
                 {activeTab === 'incomplete' ? t('task_list.empty') : t('task_list.no_tasks_completed')}
               </Text>
             </View>
           )}
      </ScrollView>
    );
  }, [baseProcessedTasks, windowWidth, isSelecting, SELECTION_BAR_HEIGHT, activeTab, toggleTaskDone, isReordering, draggingFolder, noFolderName, moveFolderOrder, stopReordering, selectedItems, onLongPressSelectItem, sortMode, isTaskReorderMode, onTaskReorder, onFolderReorder, styles.emptyContainer, styles.emptyText, t, isTaskDragging, handleTaskDragStateChange, folderOrder]);

  return (
    <PagerView
      ref={pagerRef}
      style={{ flex: 1 }}
      initialPage={selectedTabIndex}
      onPageSelected={handlePageSelected}
      onPageScroll={handlePageScroll}
      key={folderTabs.map(f => f.name).join('-')}
      offscreenPageLimit={1}
    >
      {folderTabs.map((folder, index) => renderPageContent(folder.name, index))}
    </PagerView>
  );
});