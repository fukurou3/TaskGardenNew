// app/(tabs)/draggable-test.tsx
import React, { useState, useCallback, useEffect, useMemo, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, InteractionManager } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { TaskItem } from '@/features/tasks/components/TaskItem';
import { createStyles } from '@/features/tasks/styles';
import { FontSizeContext } from '@/context/FontSizeContext';

// Use real task operations
import TasksDatabase from '@/lib/TaskDatabase';
import type { DisplayableTaskItem, Task } from '@/features/tasks/types';
import { calculateNextDisplayInstanceDate, calculateActualDueDate } from '@/features/tasks/utils';
import dayjs from 'dayjs';

// Safe gesture item component - removing React.memo to avoid potential issues
const SafeGestureTaskItem = ({ 
  item, 
  index, 
  isDragMode, 
  draggedItemId, 
  draggedItemY, 
  scrollEnabled,
  onLongPressStart,
  onDragUpdate,
  onDragEnd,
  renderContent,
  isReorderMode,
  dragTargetIndex,
  draggedItemOriginalIndex
}: {
  item: DisplayableTaskItem;
  index: number;
  isDragMode: Animated.SharedValue<boolean>;
  draggedItemId: Animated.SharedValue<string>;
  draggedItemY: Animated.SharedValue<number>;
  scrollEnabled: Animated.SharedValue<boolean>;
  onLongPressStart: (itemId: string) => void;
  onDragUpdate: (translationY: number, itemId: string) => void;
  onDragEnd: (index: number, translationY: number, itemId: string) => void;
  renderContent: (item: DisplayableTaskItem, index: number, panGesture?: any) => React.ReactNode;
  isReorderMode: boolean;
  dragTargetIndex: Animated.SharedValue<number>;
  draggedItemOriginalIndex: Animated.SharedValue<number>;
}) => {
  // Safe values for worklet
  const itemId = item.keyId;
  const itemTitle = item.title || 'Unknown';

  // Long press gesture for entering reorder mode
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      runOnJS(onLongPressStart)(itemId);
    });

  // Simplified animation: separate drag and spacing concerns
  const dragTranslateY = useSharedValue(0);    // For drag movement
  
  // Reset individual item's translate when not being dragged
  useAnimatedReaction(
    () => isDragMode.value && draggedItemId.value === itemId,
    (isDraggingThisItem) => {
      if (!isDraggingThisItem) {
        dragTranslateY.value = 0;
      }
    }
  );
  
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      runOnJS(onDragUpdate)(0, itemId); // Initialize drag mode
    })
    .onUpdate((event) => {
      'worklet';
      dragTranslateY.value = event.translationY;
      runOnJS(onDragUpdate)(event.translationY, itemId);
    })
    .onEnd((event) => {
      'worklet';
      // Only notify JS thread - no SharedValue resets here
      runOnJS(onDragEnd)(index, event.translationY, itemId);
    });

  // Only use long press gesture when NOT in reorder mode
  const composedGesture = isReorderMode ? Gesture.Tap() : longPressGesture;

  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = draggedItemId.value === itemId;
    const isDragModeActive = isDragMode.value;
    
    // 3つの明確な状態に分離
    if (isDragging) {
      // ①自分がドラッグされている最中 - 指に追従
      return {
        transform: [
          { translateY: dragTranslateY.value },
          { scale: 1.05 }
        ] as any,
        zIndex: 1000,
        elevation: 10,
      };
    } else if (isDragModeActive) {
      // ②他のアイテムがドラッグされている最中 - スペーシングアニメーション
      const originalIndex = draggedItemOriginalIndex.value;
      const targetIndex = dragTargetIndex.value;
      const currentIndex = index;
      
      let spacingOffset = 0;
      if (originalIndex !== -1 && targetIndex !== -1) {
        if (originalIndex < targetIndex) {
          // Dragging down: items between original and target move up
          if (currentIndex > originalIndex && currentIndex <= targetIndex) {
            spacingOffset = -80; // Move up to fill gap
          }
        } else if (originalIndex > targetIndex) {
          // Dragging up: items between target and original move down
          if (currentIndex >= targetIndex && currentIndex < originalIndex) {
            spacingOffset = 80; // Move down to make space
          }
        }
      }
      
      return {
        transform: [
          { translateY: withSpring(spacingOffset) },
          { scale: 1 }
        ] as any,
        zIndex: 1,
        elevation: 0,
      };
    } else {
      // ③誰もドラッグされていない（通常時） - withSpringを使わない
      return {
        transform: [
          { translateY: 0 },
          { scale: 1 }
        ] as any,
        zIndex: 1,
        elevation: 0,
      };
    }
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={animatedStyle}>
        {renderContent(item, index, isReorderMode ? panGesture : undefined)}
      </Animated.View>
    </GestureDetector>
  );
};

export default function DraggableTestScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const router = useRouter();
  const { fontSizeKey } = useContext(FontSizeContext);
  
  // Real task state
  const [tasks, setTasks] = useState<DisplayableTaskItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentTab, setCurrentTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [isLoading, setIsLoading] = useState(true);
  
  // Reorder mode state
  const [isTaskReorderMode, setIsTaskReorderMode] = useState(false);
  const [taskReorderState, setTaskReorderState] = useState<{
    isReorderMode: boolean;
    hasChanges: boolean;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
  }>({
    isReorderMode: false,
    hasChanges: false,
    onConfirm: null,
    onCancel: null,
  });
  
  const noFolderName = t('common.no_folder_name', 'フォルダなし');

  // Reanimated shared values for unified scroll control
  const isDragMode = useSharedValue(false);
  const draggedItemId = useSharedValue<string>('');
  const draggedItemY = useSharedValue(0);
  const scrollEnabled = useSharedValue(true);
  const dragTargetIndex = useSharedValue(-1);
  const draggedItemOriginalIndex = useSharedValue(-1);
  
  // React state for FlatList scroll control (synced with shared value)
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  
  // Immediate reaction to shared value changes
  useAnimatedReaction(
    () => scrollEnabled.value,
    (current) => {
      runOnJS(setIsScrollEnabled)(current);
    }
  );

  // Load real tasks
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const taskRows = await TasksDatabase.getAllTasks();
      
      if (taskRows && Array.isArray(taskRows)) {
        const parsedTasks: Task[] = taskRows.map(t => JSON.parse(t));
        
        const displayableTasks: DisplayableTaskItem[] = parsedTasks
          .filter(task => {
            const isCompleted = !!task.completedAt;
            return currentTab === 'completed' ? isCompleted : !isCompleted;
          })
          .map((task, index) => {
            const displaySortDate = calculateNextDisplayInstanceDate(task) || calculateActualDueDate(task);
            
            return {
              ...task,
              keyId: task.id,
              displayOrder: index,
              isCompletedInstance: !!task.completedAt,
              isTaskFullyCompleted: !!task.completedAt,
              displaySortDate,
              instanceDate: task.completedAt ? dayjs(task.completedAt).format('YYYY-MM-DD') : undefined,
            };
          })
          .sort((a, b) => {
            if (!a.displaySortDate && !b.displaySortDate) return 0;
            if (!a.displaySortDate) return 1;
            if (!b.displaySortDate) return -1;
            return dayjs(a.displaySortDate).diff(dayjs(b.displaySortDate));
          });
        
        setTasks(displayableTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // CRASH FIX: Simplified gesture handler
  const handleLongPressStart = useCallback((itemId: string) => {
    if (isTaskReorderMode || isSelecting) return;
    
    setIsTaskReorderMode(true);
    setTaskReorderState({
      isReorderMode: true,
      hasChanges: false,
      onConfirm: () => {
        setIsTaskReorderMode(false);
        setTaskReorderState(prev => ({ ...prev, isReorderMode: false, hasChanges: false }));
      },
      onCancel: () => {
        setIsTaskReorderMode(false);
        setTaskReorderState(prev => ({ ...prev, isReorderMode: false, hasChanges: false }));
        loadTasks();
      },
    });
  }, [isTaskReorderMode, isSelecting, loadTasks]);

  const handleDragUpdate = useCallback((translationY: number, itemId: string) => {
    // Initialize drag mode
    if (!isDragMode.value) {
      isDragMode.value = true;
      draggedItemId.value = itemId;
      
      // Store original index
      const originalIndex = tasks.findIndex(task => task.keyId === itemId);
      draggedItemOriginalIndex.value = originalIndex;
    }
    
    // Calculate target index for spacing animation
    const itemHeight = 80;
    const originalIndex = draggedItemOriginalIndex.value;
    if (originalIndex === -1) return;
    
    const moveDistance = Math.round(translationY / itemHeight);
    const newIndex = Math.max(0, Math.min(tasks.length - 1, originalIndex + moveDistance));
    
    // Update target index for spacing calculation
    if (Math.abs(moveDistance) >= 1) {
      dragTargetIndex.value = newIndex;
    } else {
      dragTargetIndex.value = -1;
    }
  }, [tasks, isDragMode, draggedItemId, dragTargetIndex, draggedItemOriginalIndex]);

  const handleDragEnd = useCallback((fromIndex: number, translationY: number, itemId: string) => {
    console.log(`Drag ended: fromIndex=${fromIndex}, translationY=${translationY}, itemId=${itemId}`);
    
    // --- ステップA: 並べ替えロジックの実行 ---
    if (fromIndex < 0 || fromIndex >= tasks.length) {
      // Invalid index - reset animation state after interactions
      InteractionManager.runAfterInteractions(() => {
        isDragMode.value = false;
        draggedItemId.value = '';
        draggedItemY.value = 0;
        dragTargetIndex.value = -1;
        draggedItemOriginalIndex.value = -1;
      });
      return;
    }
    
    const draggedTask = tasks[fromIndex];
    if (!draggedTask || draggedTask.keyId !== itemId) {
      // Invalid task - reset animation state after interactions
      InteractionManager.runAfterInteractions(() => {
        isDragMode.value = false;
        draggedItemId.value = '';
        draggedItemY.value = 0;
        dragTargetIndex.value = -1;
        draggedItemOriginalIndex.value = -1;
      });
      return;
    }
    
    const draggedFolderName = draggedTask.folder || noFolderName;
    const itemHeight = 80;
    const moveDistance = Math.round(translationY / itemHeight);
    let newIndex = Math.max(0, Math.min(tasks.length - 1, fromIndex + moveDistance));
    
    // Folder boundary enforcement
    const sameFolderIndices: number[] = [];
    tasks.forEach((task, index) => {
      const taskFolderName = task.folder || noFolderName;
      if (taskFolderName === draggedFolderName) {
        sameFolderIndices.push(index);
      }
    });
    
    if (sameFolderIndices.length <= 1) {
      // Single item in folder - reset animation state after interactions
      InteractionManager.runAfterInteractions(() => {
        isDragMode.value = false;
        draggedItemId.value = '';
        draggedItemY.value = 0;
        dragTargetIndex.value = -1;
        draggedItemOriginalIndex.value = -1;
      });
      return;
    }
    
    const minFolderIndex = Math.min(...sameFolderIndices);
    const maxFolderIndex = Math.max(...sameFolderIndices);
    newIndex = Math.max(minFolderIndex, Math.min(maxFolderIndex, newIndex));
    
    if (newIndex < tasks.length) {
      const targetFolderName = tasks[newIndex].folder || noFolderName;
      if (targetFolderName !== draggedFolderName) {
        newIndex = sameFolderIndices.reduce((closest, current) => 
          Math.abs(current - newIndex) < Math.abs(closest - newIndex) ? current : closest
        );
      }
    }
    
    if (newIndex !== fromIndex && Math.abs(moveDistance) >= 1) {
      console.log(`Reordering task from ${fromIndex} to ${newIndex} within folder: ${draggedFolderName}`);
      
      const newTasks = [...tasks];
      const [movedItem] = newTasks.splice(fromIndex, 1);
      newTasks.splice(newIndex, 0, movedItem);
      
      // 1. First update React state to trigger re-render
      setTasks(newTasks);
      setTaskReorderState(prev => ({ ...prev, hasChanges: true }));
    }
    
    // --- ステップB: アニメーション状態のリセット ---
    // InteractionManagerを使い、すべての操作（特にReactの再レンダリング）が
    // 完了した「後」に、アニメーション用の共有値をリセットする
    InteractionManager.runAfterInteractions(() => {
      isDragMode.value = false;
      draggedItemId.value = '';
      draggedItemY.value = 0;
      dragTargetIndex.value = -1;
      draggedItemOriginalIndex.value = -1;
    });
  }, [tasks, noFolderName, isDragMode, draggedItemId, draggedItemY, dragTargetIndex, draggedItemOriginalIndex]);

  // Toggle task done
  const handleToggleTaskDone = useCallback(async (id: string, instanceDate?: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (task) {
        const updatedTask = { ...task };
        if (task.completedAt) {
          // Mark as incomplete
          delete updatedTask.completedAt;
        } else {
          // Mark as complete
          updatedTask.completedAt = new Date().toISOString();
        }
        await TasksDatabase.saveTask(updatedTask);
        await loadTasks();
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }, [tasks, loadTasks]);

  // Long press select
  const handleLongPressSelect = useCallback((id: string) => {
    if (isTaskReorderMode) {
      return;
    }
    
    if (isSelecting) {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(selectedId => selectedId !== id)
          : [...prev, id]
      );
    }
  }, [isSelecting, isTaskReorderMode]);

  // Render task item content
  const renderTaskItemContent = useCallback((item: DisplayableTaskItem, index: number, panGesture?: any) => {
    if (!item) {
      return null;
    }
    
    const folderName = item.folder || noFolderName;
    const isFirstInFolder = index === 0 || 
      (tasks[index - 1] && (tasks[index - 1].folder || noFolderName) !== folderName);
    
    const styles = createStyles(isDark, subColor, fontSizeKey);
    
    const folderHeaderStyle = {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#3A3A3C' : '#D1D1D6',
      marginBottom: 4,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    };

    const folderTextStyle = {
      fontSize: 16,
      fontWeight: '600' as const,
      color: isDark ? '#FFFFFF' : '#000000',
    };

    const reorderRowStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderRadius: 8,
      marginHorizontal: 8,
      marginVertical: 2,
    };

    const dragHandleStyle = {
      padding: 16,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderRadius: 8,
      marginRight: 8,
      marginLeft: 8,
      minWidth: 44,
      minHeight: 44,
    };

    const dragTextStyle = {
      fontSize: 16,
      color: isDark ? '#8E8E93' : '#C7C7CC',
      fontWeight: '600' as const,
    };
    
    return (
      <View>
        {isFirstInFolder && (
          <View style={folderHeaderStyle}>
            <Ionicons
              name="folder-open-outline"
              size={20}
              color={isDark ? '#E0E0E0' : '#333333'}
              style={{ marginRight: 10 }}
            />
            <Text style={folderTextStyle}>
              {folderName === noFolderName ? 'フォルダなし' : folderName}
            </Text>
          </View>
        )}
        
        {isTaskReorderMode ? (
          <View style={reorderRowStyle}>
            <View style={{ flex: 1 }}>
              <TaskItem
                task={item}
                onToggle={() => {}}
                isSelecting={false}
                selectedIds={[]}
                onLongPressSelect={() => {}}
                currentTab={currentTab}
                isDraggable={false}
              />
            </View>
            
            <GestureDetector gesture={panGesture}>
              <Animated.View style={dragHandleStyle}>
                <Text style={dragTextStyle}>ドラッグ</Text>
              </Animated.View>
            </GestureDetector>
          </View>
        ) : (
          <View style={{ backgroundColor: 'transparent' }}>
            <TaskItem
              task={item}
              onToggle={handleToggleTaskDone}
              isSelecting={isSelecting}
              selectedIds={selectedIds}
              onLongPressSelect={(id) => {
                // Long press handling is now unified in GestureDetector
                // This is kept for compatibility but won't be triggered
                if (!isSelecting && currentTab === 'incomplete') {
                  handleLongPressSelect(id);
                }
              }}
              currentTab={currentTab}
              isDraggable={false}
            />
          </View>
        )}
      </View>
    );
  }, [
    tasks, noFolderName, isDark, subColor, fontSizeKey, isTaskReorderMode, 
    currentTab, isSelecting, handleLongPressSelect, handleToggleTaskDone, selectedIds
  ]);

  const screenStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0C0C0C' : '#f2f2f4',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#3A3A3C' : '#D1D1D6',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    backButton: {
      padding: 8,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA',
      borderRadius: 12,
      padding: 2,
      marginHorizontal: 16,
      marginVertical: 8,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    tabButtonSelected: {
      backgroundColor: isDark ? subColor : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#A0A0A0' : '#545454',
    },
    tabTextSelected: {
      color: isDark ? '#FFFFFF' : subColor,
      fontWeight: '600',
    },
    listContainer: {
      flex: 1,
      paddingTop: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? '#8E8E93' : '#6D6D72',
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={screenStyles.container}>
      {/* Header */}
      <View style={screenStyles.header}>
        <TouchableOpacity 
          style={screenStyles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={screenStyles.headerTitle}>
          {t('draggable_test.title', 'Draggable Test')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Selector */}
      <View style={screenStyles.tabContainer}>
        <TouchableOpacity
          style={[
            screenStyles.tabButton,
            currentTab === 'incomplete' && screenStyles.tabButtonSelected
          ]}
          onPress={() => setCurrentTab('incomplete')}
        >
          <Text style={[
            screenStyles.tabText,
            currentTab === 'incomplete' && screenStyles.tabTextSelected
          ]}>
            {t('tasks.incomplete', '未完了')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            screenStyles.tabButton,
            currentTab === 'completed' && screenStyles.tabButtonSelected
          ]}
          onPress={() => setCurrentTab('completed')}
        >
          <Text style={[
            screenStyles.tabText,
            currentTab === 'completed' && screenStyles.tabTextSelected
          ]}>
            {t('tasks.completed', '完了済み')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <View style={screenStyles.listContainer}>
        {isLoading ? (
          <View style={screenStyles.emptyContainer}>
            <Text style={screenStyles.emptyText}>
              {t('common.loading', '読み込み中...')}
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={screenStyles.emptyContainer}>
            <Text style={screenStyles.emptyText}>
              {currentTab === 'incomplete' 
                ? t('tasks.no_incomplete_tasks', 'タスクがありません')
                : t('tasks.no_completed_tasks', '完了済みタスクがありません')
              }
            </Text>
          </View>
        ) : (
          <Animated.FlatList
            data={tasks}
            renderItem={({ item, index }) => {
              if (!item || !item.keyId) {
                return null;
              }
              console.log('🔄 Rendering task item:', item.title, 'currentTab:', currentTab);
              return (
                <SafeGestureTaskItem
                  item={item}
                  index={index}
                  isDragMode={isDragMode}
                  draggedItemId={draggedItemId}
                  draggedItemY={draggedItemY}
                  scrollEnabled={scrollEnabled}
                  onLongPressStart={handleLongPressStart}
                  onDragUpdate={handleDragUpdate}
                  onDragEnd={handleDragEnd}
                  renderContent={renderTaskItemContent}
                  isReorderMode={isTaskReorderMode}
                  dragTargetIndex={dragTargetIndex}
                  draggedItemOriginalIndex={draggedItemOriginalIndex}
                />
              );
            }}
            keyExtractor={(item, index) => item?.keyId || `task-${index}`}
            scrollEnabled={isScrollEnabled}
            contentContainerStyle={{ 
              paddingTop: 8, 
              paddingBottom: isTaskReorderMode ? 120 : 100 
            }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            showsVerticalScrollIndicator={true}
          />
        )}
      </View>

      {/* Reorder Mode Buttons */}
      {taskReorderState.isReorderMode && (
        <View style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <TouchableOpacity 
            style={{
              backgroundColor: isDark ? '#48484A' : '#E5E5EA',
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => taskReorderState.onCancel?.()}
          >
            <Ionicons name="close" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
            <Text style={{ 
              color: isDark ? '#FFFFFF' : '#000000',
              fontWeight: '600',
              marginLeft: 8,
              fontSize: 16,
            }}>
              {t('common.cancel', 'キャンセル')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{
              backgroundColor: taskReorderState.hasChanges ? subColor : (isDark ? '#48484A' : '#E5E5EA'),
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              opacity: taskReorderState.hasChanges ? 1 : 0.6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: taskReorderState.hasChanges ? 0.2 : 0.1,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => taskReorderState.onConfirm?.()}
            disabled={!taskReorderState.hasChanges}
          >
            <Ionicons 
              name="checkmark" 
              size={20} 
              color={taskReorderState.hasChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC')} 
            />
            <Text style={{ 
              color: taskReorderState.hasChanges ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC'),
              fontWeight: '600',
              marginLeft: 8,
              fontSize: 16,
            }}>
              {t('common.done', '完了')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}