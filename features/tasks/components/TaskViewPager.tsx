// app/features/tasks/components/TaskViewPager.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Dimensions, FlatList, ScrollView } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent, type PagerViewOnPageScrollEvent } from 'react-native-pager-view';
import type { TaskScreenStyles } from '@/features/tasks/styles';
import type { DisplayableTaskItem, SelectableItem } from '@/features/tasks/types';
import { TaskFolder, type Props as TaskFolderProps } from '@/features/tasks/components/TaskFolder';
import type { ActiveTab, FolderTab, MemoizedPageData } from '@/features/tasks/hooks/useTasksScreenLogic';
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
  memoizedPagesData: Map<string, MemoizedPageData>;
  sortMode?: 'deadline' | 'custom';
  isTaskReorderMode?: boolean;
  onTaskReorder?: (folderName: string) => (fromIndex: number, toIndex: number) => Promise<void>;
  onFolderReorder?: (folderName: string, fromIndex: number, toIndex: number) => void;
};

const windowWidth = Dimensions.get('window').width;

export const TaskViewPager: React.FC<TaskViewPagerProps> = ({
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
  memoizedPagesData,
  sortMode = 'deadline',
  isTaskReorderMode = false,
  onTaskReorder,
  onFolderReorder,
}) => {
  // State to control ScrollView scroll enabled
  const [isTaskDragging, setIsTaskDragging] = useState(false);
  
  // Check if any folder is in draggable mode
  const isInDraggableMode = useMemo(() => {
    return sortMode === 'custom' && activeTab === 'incomplete' && !isSelecting;
  }, [sortMode, activeTab, isSelecting]);
  
  // Callback to handle task drag state changes
  const handleTaskDragStateChange = useCallback((isDragging: boolean) => {
    console.log('📜 ScrollView control - Task dragging state changed:', isDragging);
    setIsTaskDragging(isDragging);
  }, []);
  // Simplified page rendering
  const renderPageContent = useMemo(() => (pageFolderName: string, pageIndex: number) => {
    const pageData = memoizedPagesData.get(pageFolderName);
    if (!pageData) {
        return <View key={`page-${pageFolderName}-${pageIndex}`} style={{ width: windowWidth, flex: 1 }} />;
    }
    const { foldersToRender, tasksByFolder, allTasksForPage } = pageData;

    return (
      <ScrollView 
        key={`page-${pageFolderName}-${pageIndex}`} 
        style={{ width: windowWidth, flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: isSelecting ? SELECTION_BAR_HEIGHT + 20 : 100 }}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={8}
        removeClippedSubviews={true}
        nestedScrollEnabled={true}
        overScrollMode="never"
        bounces={true}
        bouncesZoom={false}
        decelerationRate={0.998}
        snapToAlignment="start"
        scrollEnabled={!isTaskDragging && !isInDraggableMode} // Disable scroll when task is being dragged or in draggable mode
      >
          {foldersToRender.map((folderName, folderIndex) => {
            const sortedFolderTasks = tasksByFolder.get(folderName) || [];
            if (activeTab === 'completed' && sortedFolderTasks.length === 0) {
              return null;
            }
            const taskFolderProps: Omit<TaskFolderProps, 'isCollapsed' | 'toggleFolder' | 'onRefreshTasks'> = {
              folderName,
              tasks: sortedFolderTasks,
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
              folderIndex,
              totalFolders: foldersToRender.length,
              onTaskDragStateChange: handleTaskDragStateChange, // Add callback for ScrollView control
            };
            return <TaskFolder key={`${pageFolderName}-${folderName}-${pageIndex}`} {...taskFolderProps} />;
          })}
          {allTasksForPage.length === 0 && (
             <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>
                 {activeTab === 'incomplete' ? t('task_list.empty') : t('task_list.no_tasks_completed')}
               </Text>
             </View>
           )}
      </ScrollView>
    );
  }, [memoizedPagesData, windowWidth, isSelecting, SELECTION_BAR_HEIGHT, activeTab, toggleTaskDone, isReordering, draggingFolder, noFolderName, moveFolderOrder, stopReordering, selectedItems, onLongPressSelectItem, sortMode, isTaskReorderMode, onTaskReorder, onFolderReorder, styles.emptyContainer, styles.emptyText, t, isTaskDragging, handleTaskDragStateChange]);

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
};