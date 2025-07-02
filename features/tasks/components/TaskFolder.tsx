// app/features/tasks/components/TaskFolder.tsx
import React, { useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedAnimated from 'react-native-reanimated';
import { DisplayableTaskItem } from '../types';
import { TaskItem } from './TaskItem';
import { SafeGestureTaskItem } from './SafeGestureTaskItem';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FontSizeContext, FontSizeKey } from '@/context/FontSizeContext';
import { createStyles } from '../styles';
import { fontSizes } from '@/constants/fontSizes';
import dayjs from 'dayjs';

// ネイティブドラッグ&ドロップの準備

// 固定スタイル定数（再計算防止）
const DEADLINE_CONTAINER_STYLE = { 
  alignItems: 'flex-end' as const, 
  justifyContent: 'center' as const, 
  minHeight: 30 
};


export interface Props {
  folderName: string;
  tasks: DisplayableTaskItem[];
  onToggleTaskDone: (id: string, instanceDate?: string) => void;
  isReordering: boolean;
  setDraggingFolder: (name: string | null) => void;
  draggingFolder: string | null;
  moveFolder: (folderName: string, direction: 'up' | 'down') => void;
  stopReordering: () => void;
  isSelecting: boolean;
  selectedIds: string[];
  onLongPressSelect: (type: 'task' | 'folder', id: string) => void;
  currentTab: 'incomplete' | 'completed';
  sortMode?: 'deadline' | 'custom';
  isTaskReorderMode?: boolean;
  onTaskReorder?: (fromIndex: number, toIndex: number) => Promise<void>;
  onFolderReorder?: (folderName: string, fromIndex: number, toIndex: number) => void;
  folderIndex?: number;
  totalFolders?: number;
  onTaskDragStateChange?: (isDragging: boolean) => void;
  onChangeSortMode?: (sortMode: 'deadline' | 'custom') => void;
  onReorderModeChange?: (isReorderMode: boolean, hasChanges: boolean, onConfirm: () => void, onCancel: () => void) => void;
  
  // ===== CENTRALIZED DRAG & DROP PROPS =====
  // Pending tasks for this folder (from parent)
  pendingTasks?: DisplayableTaskItem[];
  hasChanges?: boolean;
  isScrollEnabled?: boolean;
  // Centralized drag handlers (from parent)
  onLongPressStart?: (itemId: string, folderName: string) => void;
  onDragUpdate?: (translationY: number, itemId: string, folderName: string) => void;
  onDragEnd?: (fromIndex: number, translationY: number, itemId: string, folderName: string) => void;
  // Centralized shared values (from parent)
  isDragMode?: any; // SharedValue<boolean>
  draggedItemId?: any; // SharedValue<string>
  dragTargetIndex?: any; // SharedValue<number>
  draggedItemOriginalIndex?: any; // SharedValue<number>
  draggedItemFolderName?: any; // SharedValue<string>
}

export const TaskFolder = React.memo<Props>(({
  folderName,
  tasks,
  onToggleTaskDone,
  isReordering,
  setDraggingFolder,
  draggingFolder,
  moveFolder,
  stopReordering,
  isSelecting,
  selectedIds,
  onLongPressSelect,
  currentTab,
  sortMode = 'deadline',
  isTaskReorderMode = false,
  onTaskReorder,
  onFolderReorder,
  folderIndex = 0,
  totalFolders = 1,
  onTaskDragStateChange,
  onChangeSortMode,
  onReorderModeChange,
  
  // ===== CENTRALIZED DRAG & DROP PROPS =====
  pendingTasks,
  hasChanges,
  isScrollEnabled = true,
  onLongPressStart,
  onDragUpdate,
  onDragEnd,
  isDragMode,
  draggedItemId,
  dragTargetIndex,
  draggedItemOriginalIndex,
  draggedItemFolderName,
}) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { fontSizeKey } = useContext(FontSizeContext);
  // 🔥 useMemoでstylesオブジェクトの生成をメモ化し、不要な再生成を防ぐ
  const styles = useMemo(() => createStyles(isDark, subColor, fontSizeKey), [isDark, subColor, fontSizeKey]);
  const { t } = useTranslation();
  const baseFontSize = fontSizes[fontSizeKey];

  const noFolderName = t('common.no_folder_name', 'フォルダなし');
  
  // ★ PERFORMANCE OPTIMIZATION: Individual task filtering and sorting with useMemo
  const filteredAndSortedTasks = useMemo(() => {
    // Step 1: Filter tasks for this folder
    let filteredTasks = tasks.filter(task => (task.folder || noFolderName) === folderName);
    
    // Step 2: Apply tab filtering (incomplete/completed)
    if (currentTab === 'completed') {
      const completedDisplayItems: DisplayableTaskItem[] = [];
      filteredTasks.forEach(task => {
        if (task.isTaskFullyCompleted && !task.deadlineDetails?.repeatFrequency) {
          completedDisplayItems.push({ 
            ...task, 
            keyId: task.id, 
            displaySortDate: task.completedAt ? dayjs.utc(task.completedAt) : null 
          });
        } else if (task.deadlineDetails?.repeatFrequency && task.completedInstanceDates && task.completedInstanceDates.length > 0) {
          task.completedInstanceDates.forEach(instanceDate => {
            completedDisplayItems.push({ 
              ...task, 
              keyId: `${task.id}-${instanceDate}`, 
              displaySortDate: dayjs.utc(instanceDate), 
              isCompletedInstance: true, 
              instanceDate: instanceDate 
            });
          });
        }
      });
      return completedDisplayItems.sort((a, b) => (b.displaySortDate?.unix() || 0) - (a.displaySortDate?.unix() || 0));
    } else {
      // Incomplete tasks
      const todayStartOfDayUtc = dayjs.utc().startOf('day');
      filteredTasks = filteredTasks
        .filter(task => {
          if (task.isTaskFullyCompleted) return false;
          if ((task.deadlineDetails as any)?.isPeriodSettingEnabled && (task.deadlineDetails as any)?.periodStartDate) {
            const periodStartDateUtc = dayjs.utc((task.deadlineDetails as any).periodStartDate).startOf('day');
            if (periodStartDateUtc.isAfter(todayStartOfDayUtc)) return false;
          }
          return true;
        })
        .map(task => ({ ...task, keyId: task.id }));
    }
    
    // Step 3: Apply sorting
    if (filteredTasks.length <= 1) return filteredTasks;
    
    return filteredTasks.sort((a, b) => {
      if (currentTab === 'incomplete' && sortMode === 'deadline') {
        const today = dayjs.utc().startOf('day');
        const getCategory = (task: DisplayableTaskItem): number => {
          const date = task.displaySortDate;
          if (!date) return 3;
          if (date.isBefore(today, 'day')) return 0;
          if (date.isSame(today, 'day')) return 1;
          return 2;
        };
        const categoryA = getCategory(a);
        const categoryB = getCategory(b);
        if (categoryA !== categoryB) return categoryA - categoryB;
        if (categoryA === 3) return a.title.localeCompare(b.title);
        const dateAVal = a.displaySortDate!;
        const dateBVal = b.displaySortDate!;
        if (dateAVal.isSame(dateBVal, 'day')) {
          const timeEnabledA = a.deadlineDetails?.isTaskDeadlineTimeEnabled === true && !a.deadlineDetails?.repeatFrequency;
          const timeEnabledB = b.deadlineDetails?.isTaskDeadlineTimeEnabled === true && !b.deadlineDetails?.repeatFrequency;
          if (timeEnabledA && !timeEnabledB) return -1;
          if (!timeEnabledA && timeEnabledB) return 1;
        }
        return dateAVal.unix() - dateBVal.unix();
      }

      if (sortMode === 'custom' && currentTab === 'incomplete') {
        const orderA = a.customOrder ?? Infinity;
        const orderB = b.customOrder ?? Infinity;
        if (orderA !== orderB) {
          if (orderA === Infinity) return 1;
          if (orderB === Infinity) return -1;
          return orderA - orderB;
        }
        return a.title.localeCompare(b.title);
      }
      
      return a.title.localeCompare(b.title);
    });
  }, [tasks, folderName, noFolderName, currentTab, sortMode]);
  
  // Debug: Track isTaskReorderMode changes
  console.log('🔥 TaskFolder render - folderName:', folderName, 'isTaskReorderMode:', isTaskReorderMode);
  







  const isFolderSelected = isSelecting && selectedIds.includes(folderName);
  
  
  
  
  
  
  
  
  





  const handlePressFolder = () => {
    if (isSelecting && folderName) {
        onLongPressSelect('folder', folderName);
    } else {
        // toggleFolder(folderName); // ← 呼び出しを削除 (何もしないか、別の動作を割り当てる)
        // 例えば、選択モードでなければ何もしない、など。
        // このテストでは、フォルダヘッダータップで開閉しなくなることを意図しています。
    }
  };



  

  


  // Mock animations since Reanimated is disabled
  const animatedFolderHeaderStyle = {
    opacity: 1,
  };

  return (
    <View 
      style={styles.folderContainer}
      nativeID={`folder-container-${folderName}`}
    >
      {folderName && (
        <View style={animatedFolderHeaderStyle}>
          <TouchableOpacity
            onPress={handlePressFolder}
            style={[
              styles.folderHeader,
              isFolderSelected && styles.folderHeaderSelected,
            ]}
            activeOpacity={0.7}
          >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
             {isSelecting && (
                <Ionicons
                    name={isFolderSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={subColor}
                    style={{ marginRight: 10 }}
                />
            )}
            {/* isCollapsed を参照しないように修正 */}
            {!isSelecting && folderName && (
                <Ionicons
                    name={"folder-open-outline"} // ← 常に開いているアイコン
                    size={20}
                    color={isDark ? '#E0E0E0' : '#333333'}
                    style={styles.folderIconStyle}
                />
            )}
            <Text style={styles.folderName} numberOfLines={1}>{folderName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* ドットメニューボタン - 無効化 */}
            

            
          </View>
        </TouchableOpacity>
        </View>
      )}
      
      {/* タスクリスト表示 */}
      {filteredAndSortedTasks && filteredAndSortedTasks.length > 0 && (
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
          }}
          nativeID={`task-list-${folderName}`}
        >
          {/* Enhanced FlatList with SafeGestureTaskItem */}
          <ReanimatedAnimated.FlatList
            key={`enhanced-${folderName}`}
            data={pendingTasks || filteredAndSortedTasks}
            renderItem={({ item, index }) => {
              if (!item || !item.keyId) {
                return null;
              }
              
              return (
                <SafeGestureTaskItem
                  key={item.keyId}
                  item={item}
                  index={index}
                  folderName={folderName}
                  
                  // TaskItem props
                  onToggleTaskDone={onToggleTaskDone}
                  isSelecting={isSelecting}
                  selectedIds={selectedIds}
                  onLongPressSelect={onLongPressSelect}
                  currentTab={currentTab}
                  isTaskReorderMode={isTaskReorderMode}
                  
                  // Centralized drag handlers
                  onLongPressStart={onLongPressStart}
                  onDragUpdate={onDragUpdate}
                  onDragEnd={onDragEnd}
                  
                  // Centralized shared values
                  isDragMode={isDragMode}
                  draggedItemId={draggedItemId}
                  dragTargetIndex={dragTargetIndex}
                  draggedItemOriginalIndex={draggedItemOriginalIndex}
                  draggedItemFolderName={draggedItemFolderName}
                />
              );
            }}
            keyExtractor={(item, index) => item?.keyId || `task-${index}`}
            getItemLayout={(data, index) => ({
              length: 80, // Fixed item height for better scroll performance
              offset: 80 * index,
              index,
            })}
            scrollEnabled={isScrollEnabled}
            contentContainerStyle={{ 
              paddingTop: 8, 
              paddingBottom: isTaskReorderMode ? 20 : 8 
            }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            showsVerticalScrollIndicator={true}
          />
        </View>
      )}

      {/* Empty state */}
      {(!filteredAndSortedTasks || filteredAndSortedTasks.length === 0) && folderName && (
        <View 
          style={{ 
            paddingVertical: 20, 
            paddingHorizontal: 16, 
            alignItems: 'center',
          }}
        >
          <Text style={{ color: isDark ? '#8E8E93' : '#6D6D72', fontSize: baseFontSize -1 }}>
            {t('task_list.empty_folder', 'このフォルダーにはタスクがありません')}
          </Text>
        </View>
      )}

    </View>
  );
});