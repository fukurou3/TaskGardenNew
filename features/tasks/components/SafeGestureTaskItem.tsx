// app/features/tasks/components/SafeGestureTaskItem.tsx
import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated from 'react-native-reanimated';

import { DisplayableTaskItem } from '../types';
import { TaskItem } from './TaskItem';
import { useAppTheme } from '@/hooks/ThemeContext';

interface SafeGestureTaskItemProps {
  item: DisplayableTaskItem;
  index: number;
  folderName: string;
  
  // Props from TaskFolder/parent
  onToggleTaskDone: (id: string, instanceDate?: string) => void;
  isSelecting: boolean;
  selectedIds: string[];
  onLongPressSelect: (type: 'task' | 'folder', id: string) => void;
  currentTab: 'incomplete' | 'completed';
  isTaskReorderMode: boolean;
  
  // Centralized drag handlers (from useTasksScreenLogic)
  onLongPressStart?: (itemId: string, folderName: string) => void;
  onDragUpdate?: (translationY: number, itemId: string, folderName: string) => void;
  onDragEnd?: (fromIndex: number, translationY: number, itemId: string, folderName: string) => void;
  
  // Centralized shared values (from useTasksScreenLogic)
  isDragMode?: any; // SharedValue<boolean>
  draggedItemId?: any; // SharedValue<string>
  dragTargetIndex?: any; // SharedValue<number>
  draggedItemOriginalIndex?: any; // SharedValue<number>
  draggedItemFolderName?: any; // SharedValue<string>
}

export const SafeGestureTaskItem = React.memo<SafeGestureTaskItemProps>(({
  item,
  index,
  folderName,
  onToggleTaskDone,
  isSelecting,
  selectedIds,
  onLongPressSelect,
  currentTab,
  isTaskReorderMode,
  onLongPressStart,
  onDragUpdate,
  onDragEnd,
  isDragMode,
  draggedItemId,
  dragTargetIndex,
  draggedItemOriginalIndex,
  draggedItemFolderName,
}) => {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const itemId = item.keyId;
  
  // Performance: Removed console.log for better performance
  
  // Local animation state for this item
  const dragTranslateY = useSharedValue(0);
  
  // Reset individual item's translate when not being dragged
  useAnimatedReaction(
    () => isDragMode?.value && draggedItemId?.value === itemId,
    (isDraggingThisItem) => {
      if (!isDraggingThisItem) {
        dragTranslateY.value = 0;
      }
    }
  );
  
  // Long press gesture for entering reorder mode
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      // Performance: Removed console.log
      if (onLongPressStart) {
        runOnJS(onLongPressStart)(itemId, folderName);
      }
    });

  // Pan gesture for drag handle (only active in reorder mode)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      if (onDragUpdate) {
        runOnJS(onDragUpdate)(0, itemId, folderName);
      }
    })
    .onUpdate((event) => {
      'worklet';
      dragTranslateY.value = event.translationY;
      if (onDragUpdate) {
        runOnJS(onDragUpdate)(event.translationY, itemId, folderName);
      }
    })
    .onEnd((event) => {
      'worklet';
      // Only notify JS thread - no SharedValue resets here
      // Note: index may be stale after re-renders, but handleDragEnd will recalculate the actual index
      if (onDragEnd) {
        runOnJS(onDragEnd)(index, event.translationY, itemId, folderName);
      }
    });

  // Only use long press gesture when NOT in reorder mode
  const composedGesture = isTaskReorderMode ? Gesture.Tap() : longPressGesture;

  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = draggedItemId?.value === itemId;
    const isDragModeActive = isDragMode?.value;
    
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
    } else if (isDragModeActive && draggedItemFolderName?.value === folderName) {
      // ②同じフォルダの他のアイテムがドラッグされている最中 - スペーシングアニメーション
      const originalIndex = draggedItemOriginalIndex?.value;
      const targetIndex = dragTargetIndex?.value;
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

  const renderContent = useCallback(() => {
    if (isTaskReorderMode) {
      // Reorder mode: show task with drag handle
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
        <View style={reorderRowStyle}>
          <View style={{ flex: 1 }}>
            <TaskItem
              task={item}
              onToggle={() => {}} // Disabled during reorder
              isSelecting={false}
              selectedIds={[]}
              onLongPressSelect={() => {}}
              currentTab={currentTab}
              isDraggable={false}
            />
          </View>
          
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View style={dragHandleStyle}>
              <Text style={dragTextStyle}>ドラッグ</Text>
            </ReanimatedAnimated.View>
          </GestureDetector>
        </View>
      );
    } else {
      // Normal mode: regular task item
      return (
        <TaskItem
          task={item}
          onToggle={onToggleTaskDone}
          isSelecting={isSelecting}
          selectedIds={selectedIds}
          onLongPressSelect={(id) => {
            if (!isSelecting && currentTab === 'incomplete') {
              // This will be handled by the longPressGesture
              onLongPressSelect('task', id);
            } else {
              onLongPressSelect('task', id);
            }
          }}
          currentTab={currentTab}
          isDraggable={false}
        />
      );
    }
  }, [
    isTaskReorderMode, item, onToggleTaskDone, isSelecting, selectedIds, 
    currentTab, onLongPressSelect, isDark, panGesture
  ]);

  return (
    <GestureDetector gesture={composedGesture}>
      <ReanimatedAnimated.View style={animatedStyle}>
        {renderContent()}
      </ReanimatedAnimated.View>
    </GestureDetector>
  );
});