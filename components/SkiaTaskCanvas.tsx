// components/SkiaTaskCanvas.tsx - Optimized Skia Canvas implementation
import React, { useMemo, useCallback, useState, memo } from 'react';
import { View, Dimensions } from 'react-native';
import { 
  Canvas, 
  Rect, 
  RoundedRect,
  rrect, 
  rect,
  Text as SkiaText,
  useFont
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useAdvancedGestureHandler } from './DragGestureHandler';
import { DRAG_CONFIG, COLORS, ITEM_HEIGHT } from './SkiaTaskCanvas/constants';
import type { 
  SkiaTaskCanvasProps, 
  SkiaTaskProps, 
  ColorScheme, 
  DragState,
  DragError 
} from './SkiaTaskCanvas/types';

// Memoized task component for optimal performance
const SkiaTask = memo<SkiaTaskProps>(({ 
  task, 
  index, 
  isSelected, 
  isBeingDragged, 
  isDraggedOver, 
  y, 
  canvasWidth, 
  colors, 
  currentTab, 
  font 
}) => {
  // Enhanced visual effects with constants
  const opacity = isBeingDragged ? DRAG_CONFIG.DRAG_OPACITY : 1.0;
  const scale = isBeingDragged ? DRAG_CONFIG.DRAG_SCALE : 1.0;
  const isCompleted = !!task.completedAt || task.isCompletedInstance || currentTab === 'completed';

  // Task background with scaling using constants
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = DRAG_CONFIG.TASK_HEIGHT * scale;
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const taskRect = rect(offsetX, y, scaledWidth, scaledHeight);
  const roundedRect = rrect(taskRect, DRAG_CONFIG.BORDER_RADIUS, DRAG_CONFIG.BORDER_RADIUS);

  // Checkbox dimensions using constants
  const checkboxX = DRAG_CONFIG.TASK_PADDING + offsetX;
  const checkboxY = y + (scaledHeight - DRAG_CONFIG.CHECKBOX_SIZE) / 2;
  const checkboxRect = rect(checkboxX, checkboxY, DRAG_CONFIG.CHECKBOX_SIZE, DRAG_CONFIG.CHECKBOX_SIZE);

  // Text positions using constants
  const titleX = DRAG_CONFIG.TASK_PADDING + DRAG_CONFIG.CHECKBOX_SIZE + 12 + offsetX;
  const titleY = y + 25; // Adjusted for better text positioning
  
  // Deadline text (memoized for performance)
  const deadlineText = useMemo(() => {
    return task.deadline ? 
      new Date(task.deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 
      '';
  }, [task.deadline]);
  
  const deadlineX = canvasWidth - DRAG_CONFIG.TASK_PADDING - 50 + offsetX;
  const deadlineY = y + 40;

  return (
    <>
      {/* Drop zone indicator */}
      {isDraggedOver && !isBeingDragged && (
        <Rect 
          rect={rect(0, y - DRAG_CONFIG.DROP_ZONE_HEIGHT, canvasWidth, DRAG_CONFIG.DROP_ZONE_HEIGHT)} 
          color={colors.accent}
          opacity={0.8} 
        />
      )}
      
      {/* Shadow effect for dragged items */}
      {isBeingDragged && (
        <RoundedRect 
          rect={rrect(
            rect(
              offsetX + DRAG_CONFIG.SHADOW_OFFSET, 
              y + DRAG_CONFIG.SHADOW_OFFSET, 
              scaledWidth, 
              scaledHeight
            ), 
            DRAG_CONFIG.BORDER_RADIUS, 
            DRAG_CONFIG.BORDER_RADIUS
          )} 
          color={COLORS.SHADOW}
          opacity={0.3} 
        />
      )}
      
      {/* Task background */}
      <RoundedRect 
        rect={roundedRect} 
        color={isSelected ? colors.selected : (isBeingDragged ? colors.background : colors.background)}
        opacity={opacity} 
      />
      
      {/* Task border */}
      <RoundedRect 
        rect={roundedRect} 
        style="stroke"
        strokeWidth={isBeingDragged ? 2 : 1}
        color={isBeingDragged ? colors.accent : colors.border}
        opacity={opacity} 
      />
      
      {/* Checkbox */}
      <Rect 
        rect={checkboxRect} 
        color={isCompleted ? colors.accent : 'transparent'}
        opacity={opacity} 
      />
      <RoundedRect 
        rect={rrect(checkboxRect, 4, 4)} 
        style="stroke"
        strokeWidth={2}
        color={colors.accent}
        opacity={opacity} 
      />
      
      {/* Checkmark if completed */}
      {isCompleted && font && (
        <SkiaText
          x={checkboxX + 6}
          y={checkboxY + 16}
          text="✓"
          font={font}
          color={colors.background}
        />
      )}
      
      {/* Checkmark fallback (if no font) */}
      {isCompleted && !font && (
        <>
          {/* Simple checkmark lines */}
          <Rect 
            rect={rect(checkboxX + 6, checkboxY + 12, 6, 2)} 
            color={colors.background}
            opacity={opacity} 
          />
          <Rect 
            rect={rect(checkboxX + 12, checkboxY + 8, 8, 2)} 
            color={colors.background}
            opacity={opacity} 
          />
        </>
      )}
      
      {/* Task title */}
      {font && (
        <SkiaText
          x={titleX}
          y={titleY}
          text={task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title}
          font={font}
          color={colors.text}
          opacity={opacity * (isCompleted ? 0.6 : 1.0)}
        />
      )}
      
      {/* Task title fallback (if no font) - improved visual representation */}
      {!font && (
        <>
          {/* Main title line */}
          <Rect 
            rect={rect(titleX, titleY - 10, Math.min(task.title.length * 8, canvasWidth - titleX - 80), 4)} 
            color={colors.text}
            opacity={opacity * (isCompleted ? 0.4 : 0.8)} 
          />
          {/* Subtitle/description line */}
          {task.title.length > 15 && (
            <Rect 
              rect={rect(titleX, titleY - 4, Math.min(task.title.length * 6, canvasWidth - titleX - 120), 3)} 
              color={colors.text}
              opacity={opacity * (isCompleted ? 0.3 : 0.6)} 
            />
          )}
        </>
      )}
      
      {/* Deadline text */}
      {deadlineText && font && (
        <SkiaText
          x={deadlineX}
          y={deadlineY}
          text={deadlineText}
          font={font}
          color={colors.textSecondary}
          opacity={opacity}
        />
      )}
      
      {/* Deadline fallback (if no font) - improved */}
      {deadlineText && !font && (
        <>
          <Rect 
            rect={rect(deadlineX, deadlineY - 8, 35, 3)} 
            color={colors.textSecondary}
            opacity={opacity * 0.8} 
          />
          <Rect 
            rect={rect(deadlineX + 5, deadlineY - 4, 25, 2)} 
            color={colors.textSecondary}
            opacity={opacity * 0.6} 
          />
        </>
      )}
      
      {/* Enhanced drag indicator - left edge */}
      {isBeingDragged && (
        <>
          <Rect 
            rect={rect(offsetX - DRAG_CONFIG.DROP_ZONE_HEIGHT, y, DRAG_CONFIG.DROP_ZONE_HEIGHT, scaledHeight)} 
            color={colors.accent}
            opacity={0.9} 
          />
          {/* Drag handle dots using constants */}
          {Array.from({ length: 4 }, (_, i) => (
            <Rect 
              key={i}
              rect={rect(
                canvasWidth - 20 + offsetX, 
                y + scaledHeight/2 - 10 + i * DRAG_CONFIG.DRAG_HANDLE_SPACING, 
                DRAG_CONFIG.DRAG_HANDLE_SIZE, 
                DRAG_CONFIG.DRAG_HANDLE_SIZE
              )} 
              color={colors.accent}
              opacity={0.7} 
            />
          ))}
        </>
      )}
    </>
  );
});

// Display name for debugging
SkiaTask.displayName = 'SkiaTask';

// Optimized main component with error boundaries
export const SkiaTaskCanvas = memo<SkiaTaskCanvasProps>(({
  tasks,
  onTaskReorder,
  onToggleTaskDone,
  selectedIds = [],
  isSelecting = false,
  onLongPressSelect,
  currentTab,
  canvasHeight,
}) => {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  
  // Load fonts with error handling
  const titleFont = useFont(require('../assets/fonts/NotoSansJP-Regular.ttf'), 16);
  
  // Memoized canvas dimensions
  const { canvasWidth, screenWidth } = useMemo(() => {
    const width = Dimensions.get('window').width;
    return {
      screenWidth: width,
      canvasWidth: width - DRAG_CONFIG.CANVAS_PADDING,
    };
  }, []);

  // Validate and sanitize tasks
  const safeTasks = useMemo(() => {
    if (!Array.isArray(tasks)) {
      if (__DEV__) {
        console.warn('SkiaTaskCanvas: tasks prop is not an array');
      }
      return [];
    }
    return tasks.filter(task => task && typeof task === 'object' && task.keyId);
  }, [tasks]);
  
  // Early return if no valid tasks
  if (safeTasks.length === 0) {
    return <View style={{ height: canvasHeight, width: '100%' }} />;
  }
  
  // Optimized drag state management
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: -1,
    targetIndex: -1,
    dragY: 0,
  });

  // Memoized task positions with error handling
  const taskPositions = useMemo(() => {
    try {
      return safeTasks.map((_, index) => index * ITEM_HEIGHT);
    } catch (error) {
      if (__DEV__) {
        console.error('SkiaTaskCanvas: Error calculating task positions', error);
      }
      return [];
    }
  }, [safeTasks.length]);

  // Update positions callback (without console.log)
  const updateTaskPosition = useCallback((index: number, newY: number) => {
    if (index < 0 || index >= safeTasks.length) {
      if (__DEV__) {
        console.warn('SkiaTaskCanvas: Invalid task index', index);
      }
      return taskPositions[index] || 0;
    }
    return newY;
  }, [safeTasks.length, taskPositions]);

  // Optimized gesture handler with clean state management
  const handleDragStateChange = useCallback((isDragging: boolean, dragIndex: number) => {
    setDragState(prevState => ({
      ...prevState,
      isDragging,
      dragIndex,
      targetIndex: isDragging ? prevState.targetIndex : -1,
      dragY: isDragging ? prevState.dragY : 0,
    }));
  }, []);

  const handleDragUpdate = useCallback((y: number, targetIdx: number) => {
    setDragState(prevState => {
      const newState = {
        ...prevState,
        dragY: y,
        targetIndex: targetIdx,
      };
      
      // Calculate animated positions for other tasks
      if (prevState.dragIndex >= 0 && targetIdx >= 0) {
        // Position calculation without console.log for performance
        const updatedPositions = safeTasks.map((_, originalIndex) => {
          if (originalIndex === prevState.dragIndex) {
            return y; // Dragged task follows finger
          }
          
          let adjustedIndex = originalIndex;
          
          if (prevState.dragIndex < targetIdx) {
            // Dragging down
            if (originalIndex > prevState.dragIndex && originalIndex <= targetIdx) {
              adjustedIndex = originalIndex - 1;
            }
          } else if (prevState.dragIndex > targetIdx) {
            // Dragging up
            if (originalIndex >= targetIdx && originalIndex < prevState.dragIndex) {
              adjustedIndex = originalIndex + 1;
            }
          }
          
          return adjustedIndex * ITEM_HEIGHT;
        });
      }
      
      return newState;
    });
  }, [safeTasks]);

  const gestureHandler = useAdvancedGestureHandler({
    tasks: safeTasks,
    onTaskReorder,
    onToggleTaskDone,
    onLongPressSelect,
    isSelecting,
    canvasHeight,
    onDragStateChange: handleDragStateChange,
    onDragUpdate: handleDragUpdate,
  });

  // Memoized color scheme with proper typing
  const colors = useMemo<ColorScheme>(() => ({
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#6D6D72',
    border: isDark ? '#38383A' : '#E5E5EA',
    selected: isDark ? '#0A84FF20' : '#007AFF20',
    accent: subColor,
    checkbox: isDark ? '#48484A' : '#C7C7CC',
    checkboxBorder: isDark ? '#6D6D72' : '#C7C7CC',
  }), [isDark, subColor]);

  // Calculate dynamic task positions based on drag state
  const getTaskPosition = useCallback((index: number): number => {
    if (!dragState.isDragging || dragState.dragIndex === -1) {
      return taskPositions[index] || index * ITEM_HEIGHT;
    }
    
    if (index === dragState.dragIndex) {
      return dragState.dragY;
    }
    
    // Calculate adjusted position for other tasks
    let adjustedIndex = index;
    
    if (dragState.dragIndex < dragState.targetIndex) {
      if (index > dragState.dragIndex && index <= dragState.targetIndex) {
        adjustedIndex = index - 1;
      }
    } else if (dragState.dragIndex > dragState.targetIndex) {
      if (index >= dragState.targetIndex && index < dragState.dragIndex) {
        adjustedIndex = index + 1;
      }
    }
    
    return adjustedIndex * ITEM_HEIGHT;
  }, [dragState, taskPositions]);

  // Optimized rendering with error boundary
  try {
    return (
      <View style={{ height: canvasHeight, width: '100%' }}>
        <GestureDetector gesture={gestureHandler.gesture}>
          <Canvas 
            style={{ 
              flex: 1, 
              width: canvasWidth, 
              height: canvasHeight,
              alignSelf: 'center'
            }}
          >
            {/* Canvas background */}
            <Rect 
              rect={rect(0, 0, canvasWidth, canvasHeight)} 
              color={colors.background}
            />
            
            {/* Render all tasks with optimized positioning */}
            {safeTasks.map((task, index) => {
              const isBeingDragged = dragState.isDragging && dragState.dragIndex === index;
              const isDraggedOver = dragState.isDragging && dragState.targetIndex === index && !isBeingDragged;
              
              return (
                <SkiaTask
                  key={task.keyId}
                  task={task}
                  index={index}
                  isSelected={selectedIds.includes(task.keyId)}
                  isBeingDragged={isBeingDragged}
                  isDraggedOver={isDraggedOver}
                  y={getTaskPosition(index)}
                  canvasWidth={canvasWidth}
                  colors={colors}
                  currentTab={currentTab}
                  font={titleFont}
                />
              );
            })}
          </Canvas>
        </GestureDetector>
      </View>
    );
  } catch (error) {
    if (__DEV__) {
      console.error('SkiaTaskCanvas: Rendering error', error);
    }
    
    // Fallback UI
    return (
      <View style={{ height: canvasHeight, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>
          レンダリングエラーが発生しました
        </Text>
      </View>
    );
  }
});

// Display name for debugging
SkiaTaskCanvas.displayName = 'SkiaTaskCanvas';