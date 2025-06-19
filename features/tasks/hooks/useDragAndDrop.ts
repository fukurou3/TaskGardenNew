// features/tasks/hooks/useDragAndDrop.ts
import { useCallback, useRef } from 'react';
import { Vibration } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS, SharedValue } from 'react-native-reanimated';
import type { DisplayableTaskItem } from '../types';

export interface UseDragAndDropReturn {
  // Shared Values
  isDragging: SharedValue<boolean>;
  dragIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  dragOffset: SharedValue<{ x: number; y: number }>;
  draggedItemScale: SharedValue<number>;
  draggedItemOpacity: SharedValue<number>;
  draggedItemElevation: SharedValue<number>;
  placeholderOpacity: SharedValue<number>;
  placeholderHeight: SharedValue<number>;
  itemOffsets: SharedValue<Record<number, number>>;
  
  // Animated Styles
  draggedItemAnimatedStyle: any;
  placeholderAnimatedStyle: any;
  getItemOffsetAnimatedStyle: (index: number) => any;
  
  // Methods
  startDrag: (index: number) => boolean;
  updateDragPosition: (offsetY: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  
  // Dragged item reference
  draggedItem: DisplayableTaskItem | null;
}

const ITEM_HEIGHT = 70;
const DRAG_THRESHOLD = 10; // 最小ドラッグ距離
const ANIMATION_DURATION = 200;

export const useDragAndDrop = (
  items: DisplayableTaskItem[],
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>
): UseDragAndDropReturn => {
  // Shared Values for animations
  const isDragging = useSharedValue(false);
  const dragIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const dragOffset = useSharedValue({ x: 0, y: 0 });
  
  // Animation shared values
  const draggedItemScale = useSharedValue(1);
  const draggedItemOpacity = useSharedValue(1);
  const draggedItemElevation = useSharedValue(0);
  const placeholderOpacity = useSharedValue(0);
  const placeholderHeight = useSharedValue(0);
  
  // Item offsets for gap animation
  const itemOffsets = useSharedValue<Record<number, number>>({});
  
  // Dragged item ref (for JS thread)
  const draggedItemRef = useRef<DisplayableTaskItem | null>(null);

  // ハプティックフィードバック (JS thread function)
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const intensity = type === 'light' ? 30 : type === 'medium' ? 50 : 100;
      Vibration.vibrate(intensity);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }, []);

  // ドラッグ開始
  const startDrag = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return false;

    // Update shared values
    isDragging.value = true;
    dragIndex.value = index;
    targetIndex.value = index;
    dragOffset.value = { x: 0, y: 0 };
    
    // Start spring animations
    draggedItemScale.value = withSpring(1.05, { damping: 15, stiffness: 150 });
    draggedItemOpacity.value = withSpring(0.9, { damping: 15, stiffness: 150 });
    draggedItemElevation.value = withSpring(8, { damping: 15, stiffness: 150 });
    
    // Store dragged item
    draggedItemRef.current = items[index];
    triggerHaptic('medium');
    
    return true;
  }, [items, triggerHaptic, isDragging, dragIndex, targetIndex, dragOffset, draggedItemScale, draggedItemOpacity, draggedItemElevation]);

  // ドラッグ位置更新
  const updateDragPosition = useCallback((offsetY: number) => {
    if (!isDragging.value) return;

    const currentDragIndex = dragIndex.value;
    if (currentDragIndex < 0) return;

    // Update drag offset with smooth spring animation
    dragOffset.value = { x: 0, y: offsetY };

    // Calculate target index
    const newTargetIndex = Math.max(0, Math.min(items.length - 1, 
      currentDragIndex + Math.round(offsetY / ITEM_HEIGHT)));

    // Threshold check
    if (Math.abs(offsetY) < DRAG_THRESHOLD) {
      targetIndex.value = currentDragIndex;
      return;
    }

    // Update target index
    const previousTargetIndex = targetIndex.value;
    targetIndex.value = newTargetIndex;

    // Animate other items if target changed
    if (newTargetIndex !== previousTargetIndex) {
      const isDownward = newTargetIndex > currentDragIndex;
      const newOffsets: Record<number, number> = {};
      
      for (let i = 0; i < items.length; i++) {
        if (i === currentDragIndex) continue;

        let newOffset = 0;
        if (isDownward && i > currentDragIndex && i <= newTargetIndex) {
          newOffset = -ITEM_HEIGHT;
        } else if (!isDownward && i >= newTargetIndex && i < currentDragIndex) {
          newOffset = ITEM_HEIGHT;
        }
        newOffsets[i] = newOffset;
      }
      
      // Update item offsets with spring animation
      itemOffsets.value = newOffsets;

      // Animate placeholder with spring
      if (newTargetIndex !== currentDragIndex) {
        placeholderOpacity.value = withSpring(1, { damping: 15, stiffness: 200 });
        placeholderHeight.value = withSpring(4, { damping: 15, stiffness: 200 });
        
        // Trigger haptic feedback on JS thread
        if (Math.abs(newTargetIndex - currentDragIndex) === 1) {
          runOnJS(triggerHaptic)('light');
        }
      } else {
        placeholderOpacity.value = withSpring(0, { damping: 15, stiffness: 200 });
        placeholderHeight.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    }
  }, [items.length, isDragging, dragIndex, targetIndex, dragOffset, itemOffsets, placeholderOpacity, placeholderHeight, triggerHaptic]);

  // JS thread function: ドラッグ終了時の並び替え実行
  const executeReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      try {
        await onReorder(fromIndex, toIndex);
        triggerHaptic('heavy');
      } catch (error) {
        console.error('Reorder failed:', error);
        triggerHaptic('medium');
      }
    }
  }, [onReorder, triggerHaptic]);

  // ドラッグ終了
  const endDrag = useCallback(() => {
    if (!isDragging.value) return;

    const fromIndex = dragIndex.value;
    const toIndex = targetIndex.value;

    // Reset animations with spring
    draggedItemScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    draggedItemOpacity.value = withSpring(1, { damping: 15, stiffness: 150 });
    draggedItemElevation.value = withSpring(0, { damping: 15, stiffness: 150 });
    placeholderOpacity.value = withSpring(0, { damping: 15, stiffness: 200 });
    placeholderHeight.value = withSpring(0, { damping: 15, stiffness: 200 });
    
    // Reset item offsets with spring
    itemOffsets.value = {};

    // Reset state
    isDragging.value = false;
    dragIndex.value = -1;
    targetIndex.value = -1;
    dragOffset.value = { x: 0, y: 0 };

    // Execute reorder if needed
    if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
      executeReorder(fromIndex, toIndex);
    }
  }, [isDragging, dragIndex, targetIndex, executeReorder, draggedItemScale, draggedItemOpacity, draggedItemElevation, placeholderOpacity, placeholderHeight, itemOffsets, dragOffset]);

  // キャンセル
  const cancelDrag = useCallback(() => {
    // Reset all animations and state with spring
    draggedItemScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    draggedItemOpacity.value = withSpring(1, { damping: 15, stiffness: 150 });
    draggedItemElevation.value = withSpring(0, { damping: 15, stiffness: 150 });
    placeholderOpacity.value = withSpring(0, { damping: 15, stiffness: 200 });
    placeholderHeight.value = withSpring(0, { damping: 15, stiffness: 200 });
    itemOffsets.value = {};

    isDragging.value = false;
    dragIndex.value = -1;
    targetIndex.value = -1;
    dragOffset.value = { x: 0, y: 0 };
  }, [draggedItemScale, draggedItemOpacity, draggedItemElevation, placeholderOpacity, placeholderHeight, itemOffsets, isDragging, dragIndex, targetIndex, dragOffset]);

  // Animated style for dragged item
  const draggedItemAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: dragOffset.value.x },
        { translateY: dragOffset.value.y },
        { scale: draggedItemScale.value },
      ],
      opacity: draggedItemOpacity.value,
      zIndex: isDragging.value ? 1000 : 1,
    };
  });

  // Animated style for placeholder
  const placeholderAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: placeholderOpacity.value,
      height: placeholderHeight.value,
    };
  }, [placeholderOpacity, placeholderHeight]);

  // Function to get item offset animated style
  const getItemOffsetAnimatedStyle = useCallback((index: number) => {
    return useAnimatedStyle(() => {
      const offset = itemOffsets.value[index] || 0;
      return {
        transform: [{ translateY: withSpring(offset, { damping: 15, stiffness: 150 }) }],
      };
    }, [itemOffsets]);
  }, [itemOffsets]);

  return {
    // Shared Values
    isDragging,
    dragIndex,
    targetIndex,
    dragOffset,
    draggedItemScale,
    draggedItemOpacity,
    draggedItemElevation,
    placeholderOpacity,
    placeholderHeight,
    itemOffsets,
    
    // Animated Styles
    draggedItemAnimatedStyle,
    placeholderAnimatedStyle,
    getItemOffsetAnimatedStyle,
    
    // Methods
    startDrag,
    updateDragPosition,
    endDrag,
    cancelDrag,
    
    // Dragged item reference
    draggedItem: draggedItemRef.current,
  };
};