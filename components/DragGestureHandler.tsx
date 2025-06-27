// components/DragGestureHandler.tsx - Advanced gesture handling for Skia Canvas
import { useMemo, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS, runOnUI, useAnimatedReaction } from 'react-native-reanimated';
import { DisplayableTaskItem } from '@/features/tasks/types';
import { DRAG_CONFIG, ITEM_HEIGHT } from './SkiaTaskCanvas/constants';
import type { DragGestureConfig } from './SkiaTaskCanvas/types';

// Use DragState from types file

export const useDragGestureHandler = (config: DragGestureConfig) => {
  const {
    tasks,
    onTaskReorder,
    onToggleTaskDone,
    onLongPressSelect,
    onTaskPress,
    isSelecting,
    canvasHeight,
    onDragStateChange,
    onDragUpdate,
  } = config;

  // Shared values for drag state
  const isDragging = useSharedValue(false);
  const dragIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const startY = useSharedValue(0);
  const dragOffset = useSharedValue(0);
  const targetIndex = useSharedValue(-1);
  const longPressTriggered = useSharedValue(false);

  // Constants from config
  const LONG_PRESS_DURATION = DRAG_CONFIG.LONG_PRESS_DURATION;
  const DRAG_THRESHOLD = DRAG_CONFIG.MIN_DRAG_DISTANCE;
  const AUTO_SCROLL_THRESHOLD = 50;
  const AUTO_SCROLL_SPEED = 5;

  // Helper functions that run on UI thread
  const getTaskIndexFromY = (y: number): number => {
    'worklet';
    return Math.floor(y / ITEM_HEIGHT);
  };

  const getTaskYPosition = (index: number): number => {
    'worklet';
    return index * ITEM_HEIGHT;
  };

  const clampDragPosition = (y: number): number => {
    'worklet';
    const maxY = Math.max(0, tasks.length * ITEM_HEIGHT - DRAG_CONFIG.TASK_HEIGHT);
    return Math.max(0, Math.min(y, maxY));
  };


  // Auto-scroll logic for long lists
  const handleAutoScroll = (gestureY: number) => {
    'worklet';
    const scrollUp = gestureY < AUTO_SCROLL_THRESHOLD;
    const scrollDown = gestureY > canvasHeight - AUTO_SCROLL_THRESHOLD;
    
    if (scrollUp || scrollDown) {
      // TODO: Implement auto-scrolling logic
      // This would require coordination with the parent ScrollView
      // For now, we handle basic positioning
    }
  };

  // Pan gesture only active after long press
  const panGesture = Gesture.Pan()
    .minDistance(DRAG_CONFIG.MIN_DRAG_DISTANCE)
    .onStart((event) => {
      'worklet';
      if (isSelecting || !longPressTriggered.value) {
        return;
      }
      
      // Start dragging only if long press was triggered
      isDragging.value = true;
      
      // Notify parent about drag start
      if (onDragStateChange) {
        runOnJS(onDragStateChange)(true, dragIndex.value, false);
      }
    })
    .onUpdate((event) => {
      'worklet';
      if (isDragging.value && dragIndex.value >= 0) {
        // Update drag position with smooth clamping
        const newY = event.y - dragOffset.value;
        dragY.value = clampDragPosition(newY);
        
        // Calculate target drop index with improved accuracy
        const centerY = event.y;
        const newTargetIndex = getTaskIndexFromY(centerY);
        const clampedTargetIndex = Math.max(0, Math.min(newTargetIndex, tasks.length - 1));
        
        // Update parent with current drag state for animations
        if (onDragUpdate) {
          runOnJS(onDragUpdate)(dragY.value, clampedTargetIndex);
        }
        
        // Only update if there's a real change
        if (clampedTargetIndex !== targetIndex.value && clampedTargetIndex !== dragIndex.value) {
          targetIndex.value = clampedTargetIndex;
        }
      }
    })
    .onEnd(() => {
      'worklet';
      if (isDragging.value && dragIndex.value >= 0) {
        const fromIndex = dragIndex.value;
        const toIndex = targetIndex.value;
        
        // Only reorder if there's a meaningful change
        if (fromIndex !== toIndex && toIndex >= 0 && toIndex < tasks.length) {
          runOnJS(onTaskReorder)(fromIndex, toIndex);
        }
        
        // Notify parent about drag end
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false, -1, false);
        }
      }
      
      // Reset all drag state
      isDragging.value = false;
      dragIndex.value = -1;
      targetIndex.value = -1;
      longPressTriggered.value = false;
      dragY.value = 0;
      startY.value = 0;
      dragOffset.value = 0;
    });

  // Long press gesture for drag initiation
  const longPressGestureForDrag = Gesture.LongPress()
    .minDuration(LONG_PRESS_DURATION)
    .maxDistance(15)
    .onStart((event) => {
      'worklet';
      if (isSelecting) {
        return;
      }
      
      const taskIndex = getTaskIndexFromY(event.y);
      if (taskIndex >= 0 && taskIndex < tasks.length) {
        longPressTriggered.value = true;
        dragIndex.value = taskIndex;
        startY.value = event.y;
        dragY.value = event.y;
        dragOffset.value = event.y - getTaskYPosition(taskIndex);
        
        // Notify parent about long press state for visual effects
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false, taskIndex, true); // long press detected
        }
      }
    })
    .onEnd(() => {
      'worklet';
      // Long press ended without drag - reset state
      if (!isDragging.value) {
        longPressTriggered.value = false;
        dragIndex.value = -1;
        
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false, -1, false);
        }
      }
    });

  // Long press gesture for selection mode (original)
  const longPressGestureForSelection = Gesture.LongPress()
    .minDuration(LONG_PRESS_DURATION)
    .maxDistance(10)
    .onStart((event) => {
      'worklet';
      if (isSelecting && onLongPressSelect) {
        const taskIndex = getTaskIndexFromY(event.y);
        if (taskIndex >= 0 && taskIndex < tasks.length) {
          runOnJS(onLongPressSelect)('task', tasks[taskIndex].keyId);
        }
      }
    });

  // Tap gesture for checkbox interactions
  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .onStart((event) => {
      'worklet';
      if (!isDragging.value && !isSelecting) {
        const taskIndex = getTaskIndexFromY(event.y);
        if (taskIndex >= 0 && taskIndex < tasks.length) {
          const task = tasks[taskIndex];
          // Check if tap is on checkbox area (left 60px of task)
          if (event.x <= 60 && onToggleTaskDone) {
            // Handle checkbox tap - toggle task completion
            runOnJS(onToggleTaskDone)(task.keyId, task.instanceDate);
          } else if (onTaskPress) {
            // Handle task detail navigation (tap on main area)
            if (!task.isCompletedInstance) {
              runOnJS(onTaskPress)(task.id);
            }
          }
        }
      } else if (isSelecting) {
        // Handle task selection in selection mode
        const taskIndex = getTaskIndexFromY(event.y);
        if (taskIndex >= 0 && taskIndex < tasks.length && onLongPressSelect) {
          const task = tasks[taskIndex];
          runOnJS(onLongPressSelect)('task', task.keyId);
        }
      }
    });

  // Compose gestures based on context
  const composedGesture = useMemo(() => {
    if (isSelecting) {
      return Gesture.Race(longPressGestureForSelection, tapGesture);
    } else {
      // For drag mode, combine long press + pan + tap
      return Gesture.Race(
        Gesture.Simultaneous(longPressGestureForDrag, panGesture),
        tapGesture
      );
    }
  }, [isSelecting, panGesture, longPressGestureForDrag, longPressGestureForSelection, tapGesture]);

  // Animated reaction to provide real-time feedback
  useAnimatedReaction(
    () => ({
      isDragging: isDragging.value,
      dragIndex: dragIndex.value,
      targetIndex: targetIndex.value,
    }),
    (current, previous) => {
      // This can be used to trigger canvas redraws or other animations
      // The actual canvas redraw logic would be implemented in the parent component
    }
  );

  // Return gesture and current drag state
  return {
    gesture: composedGesture,
    dragState: {
      isDragging,
      dragIndex,
      dragY,
      targetIndex,
      longPressTriggered,
    },
    // Helper methods for external use
    getDragState: (): DragState => {
      'worklet';
      return {
        isDragging: isDragging.value,
        dragIndex: dragIndex.value,
        dragY: dragY.value,
        startY: startY.value,
        dragOffset: dragOffset.value,
        targetIndex: targetIndex.value,
      };
    },
    resetDragState: () => {
      'worklet';
      isDragging.value = false;
      dragIndex.value = -1;
      targetIndex.value = -1;
      dragY.value = 0;
      startY.value = 0;
      dragOffset.value = 0;
    },
  };
};

// Hook for managing multiple gesture interactions
export const useAdvancedGestureHandler = (config: DragGestureConfig) => {
  const dragHandler = useDragGestureHandler(config);
  
  // Additional gesture logic can be added here
  // For example: pinch-to-zoom, double-tap actions, etc.
  
  return {
    ...dragHandler,
    // Additional gesture handlers would be included here
  };
};